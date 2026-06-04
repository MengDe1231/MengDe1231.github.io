# 多 Agent 进程内协作方案

> **文档定位：** 技术原理文档，讲解基于 Spring AI Alibaba Agent Framework 的进程内多 Agent 协作架构

---

## 一、什么是 Agent

### 一句话定义

Agent = 大模型（LLM） + 工具调用（Tools） + 自主决策（Planning） + 持续记忆（Memory）。  
能够 **理解意图 → 拆解任务 → 调用工具 → 综合结果 → 给出回答**。

### Agent 与普通 Chatbot 的区别

| 维度 | Chatbot | Agent |
|------|---------|-------|
| 能力 | 根据训练数据回答 | 能调用外部工具获取实时数据 |
| 任务处理 | 一问一答 | 拆解复杂任务为多步子任务 |
| 记忆 | 无状态，每次独立 | 有上下文记忆 |
| 自主性 | 被动回答 | 自主决定调什么工具、下一步做什么 |

### Agent 的核心组成

| 组件 | 作用 |
|------|------|
| **大脑（LLM）** | 理解意图、拆解任务、做决策 |
| **工具（Tools）** | 操作外部系统（数据库、API、文件等） |
| **记忆（Memory）** | 对话历史 + 长期知识，保持多轮连贯性 |
| **规划（Planning）** | 将复杂任务拆解为可执行的子步骤 |

### 多 Agent 协作模型

```
编排Agent（Orchestrator，大脑）
  ├── 客服Agent：订单查询、退款、售后等业务数据
  ├── 数据分析Agent：数据汇总、报表生成、趋势分析
  └── 通用Agent：兜底处理未匹配到特定子 Agent 的任务
```

**举例：** 用户问"帮我查一下某品牌最近 7 天的退货情况，并分析退货原因"

- Chatbot：只能根据已有知识回答
- 单 Agent：识别意图 → 调工具查数据 → 调工具做分析 → 汇总结果
- 多 Agent：识别意图 → 委派客服 Agent 查数据 → 委派数据分析 Agent 做分析 → 主 Agent 汇总 → 返回最终答案

**多 Agent 相比单 Agent 的优势：**

- **人格隔离**：每个子 Agent 有独立的 systemPrompt，扮演不同角色
- **成本优化**：不同子 Agent 可以用不同模型（简单任务用便宜的，复杂任务用强的）
- **权限隔离**：每个子 Agent 只能访问自己被授权的工具
- **独立扩展**：可以单独为某个子 Agent 增加工具、换模型、改 Prompt

---

## 二、架构流程

```
用户请求 POST /api/ai/v2/chat/stream {"message": "帮我查某品牌近7天退货并分析原因"}
  ▼
┌─────────────────────────────────────────────────┐
│ AiV2ChatController                              │
│ 接收请求，调用 AiV2ChatService                    │
└────────────────┬────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────┐
│ OrchestratorAgentService（编排层）                │
│ ReactAgent + SubAgentInterceptor                 │
│ LLM 分析意图 → 通过 task 工具委派子任务           │
└────────────────┬────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────┐
│ SubAgentInterceptor（进程内路由 & 执行引擎）      │
│ 为每个子 Agent 注册独立 task 工具                 │
│ 主 Agent 调哪个 task → 路由到哪个子 Agent         │
└────┬────────────────────┬───────────────────────┘
     │ task: customer_svc │ task: data_analysis
     ▼                   ▼
┌─────────────┐  ┌────────────────────┐
│ 客服子 Agent│  │ 数据分析子 Agent    │
│ qwen-plus   │  │ qwen-max            │
│ 独立 system │  │ 独立 system         │
│ 独立 tools  │  │ 独立 tools          │
│ 返回结果     │  │ 返回结果            │
└────┬────────┘  └────┬───────────────┘
     └───────┬────────┘
             ▼
┌─────────────────────────────────────────────────┐
│ 结果聚合（框架内置，无需手写代码）                │
│ 每个 task() 结果自动写入主 Agent 对话历史         │
│ LLM 在最后一轮读取所有结果 → 自行汇总输出        │
└─────────────────────────────────────────────────┘
             ▼
┌─────────────────────────────────────────────────┐
│ SseHelper.toSseEmitter(flux)                    │
│ 每个 token 推送到客户端（SSE text/event-stream） │
└─────────────────────────────────────────────────┘
```

---

## 三、完整代码实现

### 3.1 ChatModelFactory（模型路由工厂）

为 Agent 提供统一的 ChatModel 获取入口，支持多 Provider 和多模型：

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class ChatModelFactory {

    private final AiModuleProperties properties;
    private final Map<String, ChatModel> cache = new ConcurrentHashMap<>();

    /**
     * 获取默认 ChatModel
     */
    public ChatModel getDefault() {
        return get(null, null);
    }

    /**
     * 获取指定 Provider + 模型的 ChatModel
     * @param providerName null 时使用默认 Provider
     * @param modelName    null 时使用 Provider 的默认模型
     */
    public ChatModel get(String providerName, String modelName) {
        String provider = StringUtils.hasText(providerName) 
                ? providerName.toLowerCase().trim() 
                : properties.getDefaultProvider();

        ProviderConfig config = properties.getProviders().get(provider);
        if (config == null) {
            throw new IllegalStateException("AI Provider [" + provider + "] 未配置");
        }

        String model = StringUtils.hasText(modelName) ? modelName : config.getDefaultModel();
        String cacheKey = provider + ":" + model;
        return cache.computeIfAbsent(cacheKey, k -> create(provider, config, model));
    }

    private ChatModel create(String provider, ProviderConfig config, String model) {
        log.info("[AI] 初始化 ChatModel → provider={}, model={}", provider, model);
        return switch (provider) {
            case "dashscope" -> createDashScope(config, model);
            default -> createOpenAiCompatible(config, model);
        };
    }

    private ChatModel createDashScope(ProviderConfig config, String model) {
        var api = DashScopeApi.builder().apiKey(config.getApiKey()).build();
        var opts = DashScopeChatOptions.builder().model(model).enableSearch(false);
        if (config.getTemperature() != null) opts.temperature(config.getTemperature());
        if (config.getMaxTokens() != null) opts.maxToken(config.getMaxTokens());
        return DashScopeChatModel.builder().dashScopeApi(api).defaultOptions(opts.build()).build();
    }

    private ChatModel createOpenAiCompatible(ProviderConfig config, String model) {
        var apiBuilder = OpenAiApi.builder()
                .baseUrl(config.getBaseUrl())
                .apiKey(config.getApiKey());
        var api = apiBuilder.build();
        var opts = OpenAiChatOptions.builder().model(model).streamUsage(true);
        if (config.getTemperature() != null) opts.temperature(config.getTemperature());
        return OpenAiChatModel.builder().openAiApi(api).defaultOptions(opts.build()).build();
    }
}
```

**关键原理：** 不同子 Agent 可以通过 `chatModelFactory.get("dashscope", "qwen-plus")` 或 `chatModelFactory.get("volcengine", "deepseek-v3")` 获取不同 Provider 的模型，实现成本与能力的差异化。

### 3.2 OrchestratorAgentService（编排服务）

主 Agent + 子 Agent 定义 + 任务编排逻辑：

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class OrchestratorAgentService {

    private final ChatModelFactory chatModelFactory;
    private ReactAgent agent;

    @PostConstruct
    public void init() {
        // ===== Step 1：定义子 Agent 规格 =====
        // 每个子 Agent 有独立的 model + systemPrompt，互不干扰
        SubAgentSpec customerSvcSpec = SubAgentSpec.builder()
                .name("customer_service")
                .description("专注于订单查询、退款、售后的专家 Agent")
                .systemPrompt("""
                        你是一名资深客服专家，负责处理订单相关业务：
                        1. 订单查询：根据品牌、时间范围查询订单数据
                        2. 退款处理：查询退款记录、分析退款原因
                        3. 售后工单：创建和跟踪售后工单
                        
                        回答时请使用具体的数据和表格。
                        """)
                .model(chatModelFactory.get("dashscope", "qwen-plus"))  // 轻量模型，省成本
                .build();

        SubAgentSpec dataAnalysisSpec = SubAgentSpec.builder()
                .name("data_analysis")
                .description("专注于数据分析、报表生成、趋势分析的专家 Agent")
                .systemPrompt("""
                        你是一名资深数据分析师，擅长：
                        1. 数据趋势分析：识别销售/退货的上升下降趋势
                        2. 原因分析：多维度拆解数据，找出关键影响因素
                        3. 报表生成：输出结构化的分析报告
                        
                        请使用数据说话，给出可执行的建议。
                        """)
                .model(chatModelFactory.get("dashscope", "qwen-max"))   // 强力模型，保质量
                .build();

        // ===== Step 2：构建 SubAgentInterceptor =====
        // 框架内部：为每个子 Agent 注册一个独立的 task 工具
        //  - task(name="customer_service", description=..., input=...)
        //  - task(name="data_analysis", description=..., input=...)
        //  - task(name="general-purpose", description=..., input=...)
        SubAgentInterceptor interceptor = SubAgentInterceptor.builder()
                .defaultModel(chatModelFactory.getDefault())
                .addSubAgent(customerSvcSpec)    // 注册客服子 Agent
                .addSubAgent(dataAnalysisSpec)   // 注册分析子 Agent
                .includeGeneralPurpose(true)     // 包含通用兜底子 Agent
                .build();

        // ===== Step 3：构建主 Agent =====
        // 挂载 interceptor 后，主 Agent 自动获得上述 task 工具
        this.agent = ReactAgent.builder()
                .name("orchestrator")
                .description("知识中台任务编排主 Agent")
                .model(chatModelFactory.getDefault())
                .systemPrompt("""
                        你是一名任务编排助手，负责接收用户需求并将任务委派给合适的子 Agent。
                        
                        可用的子 Agent：
                        - customer_service：订单查询、退款、售后等客服相关业务
                        - data_analysis：数据分析、报表生成、趋势分析、原因拆解
                        - general-purpose：通用多步任务（前两个都不匹配时）
                        
                        注意：
                        - 如果用户请求涉及多个子任务，请依次委派
                        - 有依赖关系的任务按顺序执行（如先查数据再分析）
                        """)
                .interceptors(interceptor)       // ← 关键：挂载后自动获得 task 工具
                .saver(new MemorySaver())        // 进程内 checkpoint，保持多轮对话记忆
                .enableLogging(true)
                .build();
    }

    /**
     * 同步调用：等所有子 Agent 完成后返回最终结果
     */
    public AssistantMessage chat(String message) throws GraphRunnerException {
        return agent.call(message);
    }

    /**
     * 流式调用：逐步返回内容，适合 SSE 推送到前端
     */
    public Flux<Message> chatStream(String message) throws GraphRunnerException {
        return agent.streamMessages(message);
    }
}
```

### 3.3 OrchestratorController（SSE 流式入口）

```java
@RestController
@RequestMapping("/api/ai/v2/orchestrator")
@RequiredArgsConstructor
public class OrchestratorController {

    private final OrchestratorAgentService orchestratorAgent;

    /**
     * 流式对话入口，与现有 /api/ai/v2/chat/stream 并行运行
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestBody V2ChatRequestDTO request) {
        try {
            Flux<Message> flux = orchestratorAgent.chatStream(request.getMessage());
            return SseHelper.toSseEmitter(
                flux.map(msg -> msg instanceof AssistantMessage am ? am.getText() : "")
                    .filter(StringUtils::hasText)
            );
        } catch (GraphRunnerException e) {
            log.error("[Orchestrator] 流式调用失败", e);
            throw new AiServiceException("AI 服务调用失败", e);
        }
    }
}
```

### 3.4 SseHelper（SSE 适配工具）

将 Agent 的 `Flux<Message>` 转为 Spring MVC 的 `SseEmitter`：

```java
@Slf4j
public final class SseHelper {

    private static final long DEFAULT_TIMEOUT_MS = 3 * 60 * 1000L;

    /** AI 流式响应专用线程池（避免阻塞 Netty EventLoop） */
    private static final ExecutorService STREAM_EXECUTOR = Executors.newFixedThreadPool(
            50, new NamedThreadFactory("ai-sse-stream"));

    private SseHelper() {}

    public static SseEmitter toSseEmitter(Flux<String> textFlux) {
        return toSseEmitter(textFlux, DEFAULT_TIMEOUT_MS);
    }

    public static SseEmitter toSseEmitter(Flux<String> textFlux, long timeoutMs) {
        SseEmitter emitter = new SseEmitter(timeoutMs);

        emitter.onTimeout(() -> log.warn("AI SSE 连接超时"));
        emitter.onError(e -> log.error("AI SSE 连接异常", e));

        // 捕获 SecurityContext 并传播到异步线程
        SecurityContext securityContext = SecurityContextHolder.getContext();
        ExecutorService securityAwareExecutor =
                new DelegatingSecurityContextExecutorService(STREAM_EXECUTOR, securityContext);

        textFlux.publishOn(Schedulers.fromExecutor(securityAwareExecutor))
                .doOnNext(token -> {
                    try {
                        emitter.send(SseEmitter.event().data(token));
                    } catch (IOException e) {
                        throw new RuntimeException("Client disconnected", e);
                    }
                })
                .doOnComplete(emitter::complete)
                .doOnError(e -> {
                    if (!"Client disconnected".equals(e.getMessage())) {
                        log.error("AI 流式响应异常", e);
                    }
                })
                .subscribe();

        return emitter;
    }
}
```

---

## 四、SubAgentInterceptor 工作原理（核心原理）

### 4.1 挂载后主 Agent 获得了什么？

```java
// 你只写了一行代码：
.interceptors(interceptor)

// 但框架内部自动为主 Agent 注入了 N 个 task 工具：
//
// 工具 1: task_customer_service
//   描述: "将任务委派给 customer_service 子 Agent"
//   参数: description（任务描述）、input（任务输入）
//
// 工具 2: task_data_analysis
//   描述: "将任务委派给 data_analysis 子 Agent"
//   参数: description（任务描述）、input（任务输入）
//
// 工具 3: task_general_purpose
//   描述: "将任务委派给 general-purpose 子 Agent"
//   参数: description（任务描述）、input（任务输入）
```

主 Agent 的 LLM 在每次思考时，都能看到这些工具的 description，**自行决定**调哪个。

### 4.2 task 调用时发生了什么？（框架内部伪代码）

```java
// 主 Agent LLM 决定调用 task(name="customer_service", input="查近7天退货")
// ↓
// SubAgentInterceptor 拦截到这次调用
public String dispatch(String name, String description, String input) {
    // 1. 根据 name 查找已注册的 SubAgentSpec
    SubAgentSpec spec = subAgents.get(name);

    // 2. 用子 Agent 自己的 model（不与主 Agent 共享）
    ChatModel model = spec.getModel() != null ? spec.getModel() : defaultModel;

    // 3. 用子 Agent 自己的 systemPrompt 构建独立对话
    //    注意：子 Agent 的对话历史与主 Agent 隔离
    Prompt prompt = new Prompt(List.of(
        new SystemMessage(spec.getSystemPrompt()),   // "你是一名资深客服专家..."
        new UserMessage(description + "\n\n" + input)
    ));

    // 4. 调用 LLM，拿到结果
    String result = model.call(prompt).getResult().getOutput().getText();

    // 5. 将结果返回给主 Agent → 自动写入主 Agent 的对话历史
    return result;
}
```

### 4.3 结果怎么聚合？（没有 merge 代码的原因）

**合并 = 所有子 Agent 的结果都写进主 Agent 的对话历史 → LLM 自己读取并汇总**

不需要 Java 代码做 merge，执行流程如下：

```
用户输入："帮我查近7天退货，再分析原因"
  ↓
主 Agent 对话历史（第一轮）：
  User: "帮我查近7天退货，再分析原因"
  Assistant: [调用 task("customer_service", "查近7天退货")]
  Tool Result: "近7天退货共32笔，主要退款原因：尺码不符(40%)、色差(25%)..."
                                                              ↑ 子Agent结果自动进入对话历史
  ↓
主 Agent 对话历史（第二轮）：
  ...（第一轮内容）
  Assistant: [调用 task("data_analysis", "分析以下退货数据：32笔退货...")]
  Tool Result: "尺码不符占比40%，建议优化尺码表展示；色差占比25%，建议..."
                                                              ↑ 第二个子Agent结果也进入
  ↓
主 Agent 对话历史（第三轮 - 最终回复）：
  ...（所有历史）
  Assistant: "以下是您的查询结果：\n\n退货数据：共32笔...\n原因分析：尺码不符40%..."
              ↑ LLM 自己把所有结果合并成一段连贯的回复
```

**关键理解：** ReAct Agent 的工作模式就是"工具调用结果自然融入对话上下文，LLM 自行汇总"。每一轮的工具结果都追加到对话历史里，LLM 在最后一轮能看到完整上下文。

### 4.4 执行顺序怎么保证？

| 场景 | 保证方式 | 耗时 |
|------|---------|------|
| **串行（B 依赖 A）** | LLM 根据语义理解依赖关系，先调 A 拿到结果再调 B（task 调用是同步阻塞的） | A耗时 + B耗时 |
| **并行（A、B 无关）** | 开启 `.parallelToolExecution(true)`，框架自动并行调用 | max(A耗时, B耗时) |
| **严格顺序（A→B→C）** | 在 systemPrompt 中明确描述步骤顺序 | A耗时 + B耗时 + C耗时 |

```java
// 严格顺序示例：在 systemPrompt 中写死
.systemPrompt("""
        你是一个数据处理流水线的调度器。
        
        【严格执行以下顺序，不得跳过】
        第 1 步：调用 data-collector 采集原始数据
        第 2 步：将第 1 步的原始数据传给 data-analyzer 进行分析
        第 3 步：将第 2 步的分析结果传给 report-writer 生成报告
        """)
```

### 4.5 子 Agent 之间的关系

| 维度 | 说明 |
|------|------|
| 调用入口 | 只有主 Agent 暴露 chat/chatStream |
| 用户可见性 | 用户只知道主 Agent，看不到子 Agent |
| 任务分发 | 主 Agent 通过 task 工具自动路由 |
| 模型 | 主/子 Agent 可各自独立指定 |
| systemPrompt | 各自独立，互不干扰 |
| tools | 子 Agent 可以有自己的工具集 |
| 记忆 | 通过 MemorySaver 共享 checkpoint |
| 结果聚合 | 子 Agent 结果返回给主 Agent 汇总 |
| 部署 | 同一个进程内，无网络通信开销 |

一句话理解：**主 Agent 是"大脑"负责理解意图和分配任务，子 Agent 是"手"负责执行专业领域的工作，拦截器是"神经系统"负责传递指令和收集结果。**

---

## 五、可靠性

### 5.1 超时控制 + 自动重试

```java
SubAgentInterceptor interceptor = SubAgentInterceptor.builder()
        .defaultModel(chatModelFactory.getDefault())
        .addSubAgent(customerSvcSpec)
        .addSubAgent(dataAnalysisSpec)
        .includeGeneralPurpose(true)
        .build();

this.agent = ReactAgent.builder()
        .name("orchestrator")
        .description("知识中台任务编排主 Agent")
        .model(chatModelFactory.getDefault())
        .systemPrompt("你是一名任务编排助手...")
        .interceptors(interceptor)
        .saver(new MemorySaver())
        // 单个工具调用超时：子 Agent 执行超过 5 分钟自动终止
        .toolExecutionTimeout(Duration.ofMinutes(5))
        // 工具调用失败自动重试，最多 3 次
        .maxRetries(3)
        .enableLogging(true)
        .build();
```

**重试机制：** 工具调用失败时，框架自动捕获异常并重试。每次重试会将错误信息追加到对话历史，LLM 可以看到前次失败原因并调整策略。

### 5.2 降级策略

```java
public AssistantMessage chat(String message) {
    try {
        return agent.call(message);
    } catch (Exception e) {
        log.error("[Orchestrator] 调用失败", e);
        // 降级：返回部分回答或友好提示
        return new AssistantMessage(
                "部分任务执行超时，已为您完成可处理的部分。" +
                "以下功能暂时不可用：" + getFailedAgentNames());
    }
}
```

**降级场景举例：**

| 场景 | 表现 |
|------|------|
| A 成功 + B 超时 | "已完成数据查询，分析功能暂时不可用" |
| 全部超时 | "系统繁忙，请稍后重试" |
| 部分工具失败 | LLM 基于已成功调用的结果生成部分回答 |

### 5.3 对话历史管理（SummarizationHook + ToolCallLimitHook）

当对话轮次过多时，上下文窗口会爆满或成本过高。两个 Hook 协同解决：

```java
this.agent = ReactAgent.builder()
        .name("orchestrator")
        // ...
        // 超长对话自动摘要：对话历史超过 30 轮时，
        // 框架自动将早期对话压缩为摘要，保留最近 5 轮原文
        .hooks(new SummarizationHook())
        // 工具调用次数上限：防止 LLM 陷入无限 tool-calling 循环
        .hooks(new ToolCallLimitHook(20))
        .build();
```

| Hook | 触发条件 | 行为 |
|------|---------|------|
| **SummarizationHook** | 对话历史超过窗口限制 | 调用 LLM 将早期对话压缩为摘要 |
| **ToolCallLimitHook** | 单次 Agent 调用 tool 次数 > 上限 | 终止调用，返回"已达到最大工具调用次数" |

---

## 六、MCP 工具注册与权限控制（子 Agent 工具接入）

子 Agent 可以挂载独立的工具集。项目中使用 `@McpTool` + `@McpToolPermission` 注解注册工具：

```java
@Slf4j
@Service
public class AiPromotionWeeklyAnalysisMcpToolService extends AbstractSceneTaskExecutor {

    private static final String SCENE_NAME = "推广周度分析（通用版）";

    @Tool(description = "【场景：推广周度分析】提交推广周度分析任务。")
    @McpTool(description = "【场景：推广周度分析】提交分析任务。" +
            "【使用流程】1)提交任务 → 2)拿taskId → 3)每15秒轮询 → 4)completed后通知用户。")
    @McpToolPermission(scene = SCENE_NAME)  // 场景权限校验
    public String generatePromotionWeeklyAnalysis(
            @ToolParam(description = "开始日期，格式 yyyy-MM-dd") String startDate,
            @ToolParam(description = "结束日期，格式 yyyy-MM-dd") String endDate,
            @ToolParam(description = "对比开始日期（可选）") String compareStartDate,
            @ToolParam(description = "对比结束日期（可选）") String compareEndDate) {
        // ... 业务逻辑：提交到 AI 平台，返回 taskId
        String taskId = submitToAiPlatform(params);
        return buildSubmitResponse(taskId);
    }
}
```

**权限注册流程：**

```
启动时：McpToolRegistry（BeanPostProcessor）
  ↓ 扫描所有 Bean 中标注了 @McpTool + @McpToolPermission 的方法
  ↓ 建立 toolName → permission 映射
  ↓
运行时：Agent 调用工具前
  ↓ 检查调用者是否有对应权限
  ↓ 无权限 → 拒绝执行
```

```java
@Component
public class McpToolRegistry implements BeanPostProcessor {

    private final Map<String, String> toolPermissionMap = new ConcurrentHashMap<>();

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) {
        for (Method method : bean.getClass().getDeclaredMethods()) {
            McpTool mcpTool = method.getAnnotation(McpTool.class);
            McpToolPermission permission = method.getAnnotation(McpToolPermission.class);
            if (mcpTool != null && permission != null) {
                String toolName = StringUtils.hasText(mcpTool.name())
                        ? mcpTool.name() : method.getName();
                toolPermissionMap.put(toolName, permission.value());
            }
        }
        return bean;
    }

    public String getRequiredPermission(String toolName) {
        return toolPermissionMap.get(toolName);
    }
}
```

**子 Agent 工具隔离：** 每个子 Agent 在构建时只挂载自己需要的工具，无法访问其他子 Agent 的工具：

```java
SubAgentSpec customerSvcSpec = SubAgentSpec.builder()
        .name("customer_service")
        .tools(List.of(orderQueryTool, refundTool, afterSaleTool))  // 仅客服相关工具
        .build();

SubAgentSpec dataAnalysisSpec = SubAgentSpec.builder()
        .name("data_analysis")
        .tools(List.of(weeklyAnalysisTool, trendAnalysisTool))     // 仅数据分析工具
        .build();
```

---

## 七、实施路线图

### Phase 1：基础搭建（1-2 周）

1. 创建 `OrchestratorAgentService`，定义主 Agent
2. 创建 2-3 个子 Agent（客服、数据分析），注册到 `SubAgentInterceptor`
3. 创建 `OrchestratorController`，接入 SSE 流式响应
4. 编写测试，验证 SubAgentInterceptor 路由逻辑

### Phase 2：工具集成（1-2 周）

1. 子 Agent 接入 MCP Tools（`@McpTool` 注解的工具按权限过滤）
2. 子 Agent 独立工具集（每个子 Agent 只挂载自己需要的工具）
3. Hook 集成：`SummarizationHook`、`ToolCallLimitHook`

### Phase 3：可靠性优化（1 周）

1. 超时控制：`toolExecutionTimeout`
2. 自动重试：`maxRetries(3)`
3. 降级策略：子 Agent 超时 → 主 Agent 生成部分回答

---

## 八、高频面试题

### 8.1 Agent 基础概念

| 问题 | 要点 |
|------|------|
| 什么是 Agent？ | 大模型 + 工具调用 + 自主决策 + 持续记忆 |
| Agent 和 Chatbot 的区别？ | Chatbot 只能问答；Agent 能调工具、拆任务、有记忆、有自主决策 |
| Agent 怎么知道该调什么工具？ | Function Calling：工具名称和描述注册给大模型，模型根据意图自动匹配 |
| 什么是多 Agent 协作？ | 编排 Agent 拆任务 → 分发子 Agent 各司其职 → 结果汇总 → 生成最终回答 |
| 为什么用多 Agent 而不是一个？ | 人格隔离（不同 systemPrompt）、成本优化（不同模型）、权限隔离（不同工具集）、独立扩展 |

### 8.2 多 Agent + Spring AI Alibaba 实战

| 问题 | 要点 |
|------|------|
| 多 Agent 怎么协作？ | 编排 Agent 分析意图 → SubAgentInterceptor 通过 task 工具路由 → 各子 Agent 执行 → LLM 自行聚合 |
| 子 Agent 怎么定义？ | `SubAgentSpec.builder()` 定义 name/description/systemPrompt/model，通过 SubAgentInterceptor 注册 |
| Agent 怎么知道路由到哪个子 Agent？ | LLM 根据子 Agent 的 name + description 自动判断，无需手写路由逻辑 |
| SubAgentInterceptor 到底做了什么？ | 1) 为每个子 Agent 注册独立 task 工具；2) 拦截 task 调用路由到对应子 Agent；3) 子 Agent 结果写回主 Agent 对话历史 |
| 结果怎么合并的？代码在哪？ | 没有合并代码。每个 task() 结果自动追加到主 Agent 对话历史，LLM 在最后一轮读取所有结果自行汇总 |
| 子 Agent 执行顺序怎么保证？ | LLM 根据语义理解依赖关系自动串行；或 `.parallelToolExecution(true)` 并行；或在 systemPrompt 中写死顺序 |
| Agent 执行失败怎么处理？ | ReactAgent 内置工具重试 + toolExecutionTimeout 超时控制 + 降级回答 |
| Agent 有记忆吗？ | MemorySaver 进程内 checkpoint；SummarizationHook 超长对话自动摘要 |
| 上下文怎么传递？ | 子 Agent 通过独立的 Prompt 接收任务描述和输入，与主 Agent 的对话历史隔离，但主 Agent 能看到子 Agent 的结果 |
| 子 Agent 的工具怎么隔离？ | 构建 SubAgentSpec 时通过 `.tools()` 指定独立工具列表，每个子 Agent 只挂载自己需要的工具 |
| MCP 工具怎么注册和鉴权？ | `@McpTool` 注册工具，`@McpToolPermission` 声明权限；启动时 `McpToolRegistry` 扫描建立映射，调用前校验 |
