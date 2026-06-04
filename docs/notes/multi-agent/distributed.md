# 多 Agent 分布式任务分发方案（RocketMQ）

> **文档定位：** 技术原理文档，讲解基于 RocketMQ 的分布式多 Agent 任务分发架构

---

## 一、为什么需要消息队列？

**场景：** 用户问"分析某品牌近 30 天销售趋势，生成报表并发邮件给运营团队"

- 客服 Agent 查询订单数据（5-10 秒）
- 数据分析 Agent 生成报表（LLM + 数据库，10-30 秒）
- 邮件服务发送报表（外部系统）

全链路可能超过 60 秒导致 HTTP 超时。引入消息队列后异步解耦，用户先收到"任务已提交"，后续通过 SSE/WebSocket 推送结果。

### 与进程内方案对比

| 维度 | 进程内（SubAgentInterceptor） | 分布式（+ 消息队列） |
|------|-------------------------------|---------------------|
| **适用规模** | 单体应用，QPS < 100 | 微服务，QPS > 1000 |
| **延迟** | 毫秒级 | 秒级（网络 + MQ） |
| **部署** | 一个进程，零运维 | Broker + 多服务部署 |
| **故障隔离** | 弱（共享 JVM） | 强（进程隔离） |
| **独立扩缩容** | 不支持 | 支持（按 Agent 独立扩容） |
| **长耗时任务** | 受 HTTP 超时限制 | 无限制（异步解耦） |

**推荐策略：** 初期用进程内方案快速上线 → 混合模式（短任务进程内，长任务走 MQ） → 全面分布式方案。

---

## 二、架构流程

```
用户请求 → HTTP（同步，快速响应）
  ▼
┌─────────────────────────────────────────────────┐
│ 编排服务                                         │
│ 1. Agent 分析意图，拆分子任务                     │
│ 2. 短任务 → 进程内执行                            │
│ 3. 长任务 → 封装消息，发到 dispatch Topic         │
│ 4. 返回 "任务已提交，taskId=xxx"                 │
└────────────┬────────────────────────────────────┘
             │ 异步（RocketMQ）
             ▼
┌─────────────────────────────────────────────────┐
│ 消息队列                                         │
│ Topic: ai_agent_dispatch                         │
│ Tag: customer_service / data_analysis            │
│ 消息属性：traceId, conversationId, taskId,       │
│   agentType, action, parameters,                 │
│   contextKey（Redis key，不传大对象）             │
└────┬──────────────────────┬─────────────────────┘
     │ Tag: customer         │ Tag: data_analysis
     ▼                      ▼
┌─────────────┐  ┌────────────────────┐
│ 客服 Agent  │  │ 数据分析 Agent     │
│ (独立服务)  │  │ (独立服务)         │
│ @Listener   │  │ @Listener          │
│ 执行后      │  │ 执行后             │
│ 发回结果    │  │ 发回结果            │
└────┬────────┘  └────┬───────────────┘
     └───────┬────────┘
             ▼
┌─────────────────────────────────────────────────┐
│ 结果回传 Topic: ai_agent_result                  │
│ Result Consumer（编排服务）:                      │
│   按 conversationId 聚合结果                      │
│   所有子任务完成 → 推送给用户                     │
│   超时 → 降级回答                                │
└─────────────────────────────────────────────────┘
```

---

## 三、消息体设计

**任务消息（dispatch）：**

```json
{
  "taskId": "task_20260604_001",
  "traceId": "trace_abc123",
  "conversationId": "conv_12345",
  "agentType": "data_analysis",
  "action": "analyze_sales_trend",
  "parameters": { "brand": "某品牌", "days": 30 },
  "contextKey": "ai:context:conv_12345",
  "callbackTopic": "ai_agent_result",
  "timeout": 60000,
  "maxRetry": 3,
  "createTime": "2026-06-04T10:00:00"
}
```

**关键决策：上下文存 Redis，消息只传 contextKey**

消息体越大 MQ 传输越慢。对话上下文（多轮历史、图片等）存 Redis 并设 TTL，子 Agent 消费时按需加载。

**结果消息（result）：**

```json
{
  "taskId": "task_20260604_001",
  "conversationId": "conv_12345",
  "status": "success",
  "result": { "salesTrend": [...], "topRefundReasons": ["尺码不符", "色差"] },
  "consumeTimeMs": 12500,
  "finishTime": "2026-06-04T10:00:13"
}
```

---

## 四、核心代码

### 4.1 消息模型

```java
@Data
public class AgentTaskMessage {
    private String taskId;          // 任务唯一标识
    private String traceId;         // 全链路追踪 ID
    private String conversationId;  // 会话标识
    private String agentType;       // 目标 Agent 类型（对应 Tag）
    private String action;          // 具体动作
    private Map<String, Object> parameters;
    private String contextKey;      // Redis 上下文 key
    private String callbackTopic;   // 结果回传 Topic
    private long timeout;
    private int maxRetry;
    private int retryCount;
    private LocalDateTime createTime;
}

@Data
public class AgentResultMessage {
    private String taskId;
    private String conversationId;
    private String status;          // success / failed / timeout
    private Object result;
    private String errorMessage;
    private long consumeTimeMs;
    private LocalDateTime finishTime;
}
```

### 4.2 任务分发

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentDispatchService {

    private final RocketMQTemplate rocketMQTemplate;
    private final StringRedisTemplate redisTemplate;
    private static final String DISPATCH_TOPIC = "ai_agent_dispatch";

    public String dispatchTask(String conversationId, String agentType,
                               String action, Map<String, Object> parameters) {
        String taskId = UuidUtils.generateUuidWithPrefix("agent_task_");
        String traceId = UuidUtils.generateUuidWithPrefix("trace_");
        String contextKey = "ai:context:" + conversationId;

        AgentTaskMessage msg = new AgentTaskMessage();
        msg.setTaskId(taskId);
        msg.setTraceId(traceId);
        msg.setConversationId(conversationId);
        msg.setAgentType(agentType);
        msg.setAction(action);
        msg.setParameters(parameters);
        msg.setContextKey(contextKey);
        msg.setCallbackTopic("ai_agent_result");
        msg.setTimeout(60_000L);
        msg.setMaxRetry(3);
        msg.setCreateTime(LocalDateTime.now());

        // 上下文存入 Redis（30 分钟 TTL）
        saveConversationContext(contextKey, conversationId);

        // 同步发送到 MQ（Tag = agentType，实现按 Agent 路由）
        SendResult sendResult = rocketMQTemplate.syncSend(
                DISPATCH_TOPIC + ":" + agentType, msg);
        log.info("[Dispatch] 任务已发送: taskId={}, agentType={}, msgId={}",
                taskId, agentType, sendResult.getMsgId());

        return taskId;
    }
}
```

### 4.3 子 Agent 消费者

```java
@Slf4j
@Component
@RocketMQMessageListener(
        topic = "ai_agent_dispatch",
        consumerGroup = "cg_data_analysis_agent",
        selectorExpression = "data_analysis",
        maxReconsumeTimes = 3
)
public class DataAnalysisAgentConsumer implements RocketMQListener<AgentTaskMessage> {

    private final ChatModelFactory chatModelFactory;
    private final RocketMQTemplate rocketMQTemplate;
    private final StringRedisTemplate redisTemplate;

    @Override
    public void onMessage(AgentTaskMessage task) {
        long start = System.currentTimeMillis();
        log.info("[DataAnalysis] 收到任务: taskId={}, action={}",
                task.getTaskId(), task.getAction());

        try {
            // 从 Redis 加载对话上下文
            String context = loadContext(task.getContextKey());

            // 构建独立的 ReactAgent（与进程内方案的子 Agent 定义一致）
            ReactAgent agent = ReactAgent.builder()
                    .name("data_analysis")
                    .model(chatModelFactory.getDefault())
                    .systemPrompt("你是一名资深数据分析师，擅长数据趋势分析、原因拆解和报表生成。")
                    .saver(new MemorySaver())
                    .enableLogging(true)
                    .build();

            // 执行分析
            AssistantMessage reply = agent.call(buildPrompt(task, context));

            // 封装结果并发回
            AgentResultMessage result = new AgentResultMessage();
            result.setTaskId(task.getTaskId());
            result.setConversationId(task.getConversationId());
            result.setStatus("success");
            result.setResult(reply.getText());
            result.setConsumeTimeMs(System.currentTimeMillis() - start);
            result.setFinishTime(LocalDateTime.now());

            rocketMQTemplate.syncSend(task.getCallbackTopic(), result);
            log.info("[DataAnalysis] 任务完成: taskId={}, cost={}ms",
                    task.getTaskId(), result.getConsumeTimeMs());

        } catch (Exception e) {
            log.error("[DataAnalysis] 任务失败: taskId={}", task.getTaskId(), e);
            sendErrorResult(task, e.getMessage(), System.currentTimeMillis() - start);
            throw new RuntimeException("Agent task failed", e);  // 触发 MQ 重试
        }
    }
}
```

### 4.4 结果聚合

```java
@Slf4j
@Component
@RocketMQMessageListener(
        topic = "ai_agent_result",
        consumerGroup = "cg_agent_result_aggregator",
        maxReconsumeTimes = 0
)
public class AgentResultAggregator implements RocketMQListener<AgentResultMessage> {

    private final StringRedisTemplate redisTemplate;

    @Override
    public void onMessage(AgentResultMessage result) {
        String conversationId = result.getConversationId();

        // 任务结果存入 Redis
        redisTemplate.opsForValue().set(
                "ai:task:result:" + result.getTaskId(),
                JSON.toJSONString(result), 1, TimeUnit.HOURS);

        // 添加到会话结果集合
        String resultSetKey = "ai:conversation:results:" + conversationId;
        redisTemplate.opsForSet().add(resultSetKey, result.getTaskId());

        checkConversationCompleted(conversationId, resultSetKey);
    }

    private void checkConversationCompleted(String conversationId, String resultSetKey) {
        Set<Object> taskIds = redisTemplate.opsForSet().members(resultSetKey);
        if (taskIds == null || taskIds.isEmpty()) return;

        boolean allCompleted = true;
        List<String> partialResults = new ArrayList<>();

        for (Object taskIdObj : taskIds) {
            String taskId = taskIdObj.toString();
            String status = redisTemplate.opsForValue()
                    .get("ai:task:status:" + taskId);
            if (!"COMPLETED".equals(status) && !"FAILED".equals(status)) {
                allCompleted = false;
                break;
            }
            String resultJson = redisTemplate.opsForValue()
                    .get("ai:task:result:" + taskId);
            if (resultJson != null) {
                partialResults.add(resultJson);
            }
        }

        if (allCompleted) {
            log.info("[Aggregator] 会话所有子任务完成: conversationId={}", conversationId);
            generateFinalResponse(conversationId, partialResults);
            redisTemplate.delete(resultSetKey);
        }
    }
}
```

---

## 五、可靠性保障

### 5.1 四层保障

| 层 | 措施 | 解决的问题 |
|---|------|-----------|
| **发送端** | `syncSend()` 同步发送 | 消息没发到 MQ |
| **Broker 端** | 消息持久化 + 同步双写 | Broker 丢消息 |
| **消费端** | 消费成功自动 ACK，失败抛异常重试 | 消费失败但被确认 |
| **死信队列** | `maxReconsumeTimes=3` 后进入 DLQ | 持续失败 |

### 5.2 重试策略

| 场景 | 策略 |
|------|------|
| Agent 执行失败 | MQ 自动重试，最大 3 次，delayLevel 递增（10s → 30s → 1m） |
| Agent 超时 | 标记失败，不重试，走降级 |
| 重试 3 次后仍失败 | 死信队列，记录补偿表 + 告警 + 人工介入 |

**重试机制详解：**

消费者抛出异常后，Broker 将消息写入重试队列（Topic = `%RETRY%消费者组名`），按 delayLevel 递增延迟重投：

```
第1次失败 → delayLevel 3（10s） → 延迟10s后重投
第2次失败 → delayLevel 4（30s） → 延迟30s后重投
第3次失败 → delayLevel 5（1m）  → 延迟1m后重投 → 仍失败
  ↓
进入死信队列：Topic = `%DLQ%消费者组名`
```

### 5.3 死信队列处理

```java
@Component
@RocketMQMessageListener(
        topic = "%DLQ%cg_data_analysis_agent",
        consumerGroup = "cg_dlq_compensation"
)
public class DeadLetterCompensation implements RocketMQListener<String> {
    @Override
    public void onMessage(String messageJson) {
        log.error("[DLQ] 任务进入死信队列，需人工介入: {}", messageJson);
        // 1. 记录到补偿表  2. 告警通知  3. 定时扫描补偿表重试
    }
}
```

---

## 六、混合方案（推荐）

```
编排 Agent（Orchestrator）
  ├── 简单任务（知识问答、格式转换）   → SubAgentInterceptor 进程内执行
  ├── 中等任务（数据查询、简单分析）   → SubAgentInterceptor 进程内执行
  └── 复杂任务（报表生成、邮件发送）   → RocketMQ 异步分发
```

---

## 七、分布式实施路线图

### Phase 1：引入 RocketMQ

1. 引入 `rocketmq-spring-boot-starter`
2. 创建 `ai_agent_dispatch` 和 `ai_agent_result` 两个 Topic

### Phase 2：分发与消费

1. 实现 `AgentDispatchService` 任务分发
2. 实现子 Agent Consumer（按 Tag 路由）
3. 实现 `AgentResultAggregator` 结果聚合

### Phase 3：可靠性

1. 配置 `maxReconsumeTimes` 自动重试
2. 实现死信队列补偿处理
3. 实现超时降级策略

### Phase 4：混合模式

1. 编排 Agent 判断任务类型，短任务走进程内，长任务走 MQ
2. 统一结果返回路径（进程内 SSE + MQ SSE）

---

## 八、高频面试题

### 8.1 RocketMQ 基础

| 问题 | 要点 |
|------|------|
| 为什么需要 RocketMQ？ | 长耗时任务（> 60s）HTTP 超时；跨进程部署需要异步解耦 |
| Topic 怎么设计？ | 两个 Topic：dispatch（任务分发）+ result（结果回传），按 Tag 区分 Agent |
| 消息体包含什么？ | taskId、traceId、conversationId、agentType、action、parameters、contextKey（Redis key） |
| 为什么不把上下文放消息体？ | 消息体越大 MQ 越慢；对话上下文存 Redis，消息只传 contextKey |
| 为什么不使用顺序消费？ | Agent 任务相互独立无顺序依赖；同一会话靠 conversationId + taskId 聚合；顺序消费会串行处理降低吞吐量 |

### 8.2 可靠性

| 问题 | 要点 |
|------|------|
| Agent 执行失败怎么处理？ | 消费者抛异常 → Broker 自动重试（delayLevel 递增：10s → 30s → 1m） → 超 3 次进死信 |
| 任务超时怎么处理？ | 超时标记失败，不重试，走降级生成部分回答 |
| 死信队列怎么处理？ | 固定 Topic 格式 `%DLQ%消费者组名`，需要独立 Consumer 消费，策略是补偿表 + 告警 + 人工介入 |
| 消息会丢失吗？ | 同步发送 + Broker 持久化 + 消费端自动 ACK，四层保障 |
