<user>
I want to build the following open source application.
Therefore one of your main research tasks will be that you to take your time to very deeply research: "what are the most optimal models and frameworks to use to build the following in a simple but highly optimal and optimized way". But there are many other highly relevant questions, ideas, decisions and more that need to be studied, deeply researched, analysed and answered.

---

What we are going to build (AI-coding agent will build it later after our specification, plan and research):

- A lightwaight and very fast project for voice driven ai assistant and ai enriched dictation.
- Goal: It is a local-first, tool-augmented voice assistant platform that handles conversational help and personal workflow actions and additonally has a dedicated dictation mode with LLM-based real-time transcription cleanup, autocorrection, and writing enrichment.
- tool-augmented: plug in/add any tools via easy python within a dedicated python file; this file should only contain basic and very general tools for the start (users should be ablte to take on from there, but we should still provide a good, generally useful baseline of a few tools).
- switch betwean modes 'Assistant' and 'Dictation' via a hotkey and/or trigger either of them via a dedicated hotkey.

- Dictation mode should generally start via a specified (editable) hotkey and the user should end his dictation turn by pressing the same hotkey again -> a sound effect gets played that the transcript end got registered -> than this transcript gets corrected and enriched by the llm in background -> the enriched dictation gets pasted into the any input field the user has selected and also gets paseted into clipboard history (currently only using simple windows functionality for this). 
- The Dictation mode should only have access to a narrow selection of tools (the user should be able to specify what tools; user is able to multi-select any of the tools he set up within his dedicated python file). By defaut the Dictation should only have additional context about any current selection the user has selected as well as the current clipboard content; so no tools by default.
- The LLM turn + output pasting, should take up as little amount of time as possible while still being smart enough to meanignfully enrich the raw dictation.

- The Assistent mode should by default have full context about selected text as well as current clipboard context, but also have access to any provided tools (also here, the user should be able to specify what tools; user is able to multi-select any of the tools he set up within his dedicated python file).
- The Assistant, for now, should not be too complex. The key difference of the Assistant mode is that in this mode the agent talks back, so a real conversation between user and assistant can take place.
- The assistent will later be able to offload specified tasks to e.g. ChatGPT, send requests to api's, webhooks and other apps (for now only keep this in mind so we build with this in mind but not yet impliment such things; these tools and functionality will also be given through user specified tools). I later expect users to plug in e.g. their docker mcp gateway so they for example give the agent access to their tools runing locally on their docker mcp gateway (e.g. *DuckDuckGo-Search*, *Obsidian* etc.).

---

Now for technical expections you have to research deeply:

- I do not want to rely on a viontile setup that needs multiple seperate servers, tools, containers or anything similar.
- Instead I want one highly compact, portable and lightwaight package of an app.

- All models (SST, LLM, TTS + a potentially needed deamon or server or similar + any packages needed for the app) should be 100% local in a very lightwaight and plug and play way without causing any chaos and without any complicated setup. Everything under one contained thing/point (so absolutly no scattered local servers it runs or a deamon that needs to orchastrate and manage services etc.)
- Therefor *SST, LLM, TTS*-stack needs to be highly lightwaigh and portable while still being powerful enough to be meaningfully useful.
  - We need to deeply reasearch and lock in desitions (multi-select) for the *SST, LLM, TTS*-stack.
  - Anything like *Qwen3-4b* already may be way too much for most users. Although we need to provide the user with the option to choose a larger model (any model they want that can be run on their hardware), we want to by default only recomend very small models that are able to fullfill our needs.
  - minimum requirements when searching: good for text enrichement, light conversations, some tool calls, enough context size, multilingual.
  - We may want to by default selecct different LLM models for the two different modes respectively based on what these two modes truly need. For example the dictation mode does not need to be able to call many tools and does also not need to keep a long conversation or anything similar -> therefor we may be good using a small baseline model for *dictation + enrichment* than we would need for the Assistant mode. But the optimal would of cause to have the same model for both modes as we should generally always avoid the overhead of frequently loading different models in and out of users memory.
  - SST and TTS should always be consistant over both modes.

- For now one of the main research should be targeted at what models we should use that fullfill our specified needs and expectations in the most optimal way (highle relevant, deep research).

- I currently think that the LLM engine backend should be 'llama-cpp' (https://github.com/ggml-org/llama.cpp) as I think this may be the most straight forward and plug and play option (not compleatly sure though). 
- The app should search for if on the users pc the user has folders like 'C:/ai/models' or similar where it may should download and use LLM models from, if not there, it should create a directory on the users pc for this app and put dowloaded models there in a very usable and readable way and from now on should use models from there.
  - users should be easely able to setup a custom directory for both this as well as the python file
  - We need to lock a desition in on where it should by default put these models in; I am currently thinking something like *~/.config/the-app/models/...* or *~/.the-app/models/...* similar or somewhere in app data. For the settings/config, the users *python tools file*, potential logs, maybe even api keys etc. I think it should eb*~/.config/the-app/...* or *~/.the-app/...*. 
  - Later we could maybe also introduce locally stored conversation and dictation history etc., but we should not think about this for now as this would introduce too much complexity ( would introducte stuff like syncing, source of truth handling, different storage architextures etc.).

- We want to store ALL dictations and conversations (with tool calls ad all detail) within a convex database (seperate place for dictations and assistant conversations).
- Users will need to be logged in over either email, google or Git-Hub; the Auth should be handled via Authkit.
- If a user does not want to be logged in, no data will be stored anywhere (only locally stored settings etc. in a highly simple way), so users will be able to fully use the app with all features and settings, only that they will need to be logged in to save conversations and dictations history.
- Users should be able to optionally also save and sync their tools python file, but by default this should be turned off, as users are expected to have different tool needs on different machines.
- We do not need any payment or similar; biside history storage and log in, all real functionality is local and run on the users hardware, so nothing needs to be payed by anyone.
- No audio files should be safed ever (maybe a functionality for the future, but not now).
- For Dictations we should always store both the raw transcript as well as the enriched/edited text.
  - If the LLM enrichment for some reason fails for a dictations, we should save the raw transcript at minimum if possible (as backup). (Feature for later: re-do the LLM enrichment process for recent raw dictations; not a feature for now).

---

Some thoughts and decisions to be made:

- Should this just be used via cli, or should we also make a small electron app (ui) on top that makes the UX way better?
  - Tools should still be set up within a dedicated python script by the user, but via the ui user would be able to change settings, view past transcripts, set some behaviour settings and additional (system-)context settings and potentially even switch ai model etc.
  - This should be extreamly simple and lightwaight; so only a simple, very clean ui for it using base ui, tailwind and shadcn components and a simple but clean ui icons library (should look like a ui made by open ai) etc.
</user>

---

<deep-research-agent>
This is an ambitious and well-scoped project. To make sure I conduct the right research and prioritize appropriately, could you confirm a few points:

1. **Target platforms**: Should this app be built primarily for Windows, or should macOS/Linux be considered equally from the start?
2. **Hardware constraints**: Are we optimizing for devices with CPUs only, or can we assume GPU acceleration (e.g. for LLM inference or audio processing)?
3. **Dictation focus**: Should the SST model be highly optimized for general speech or for specific accents/domains (e.g., tech users)?
4. **LLM framework**: You mentioned llama.cpp as a likely backend. Are you open to also exploring alternatives like GGUF-compatible runtimes (e.g. MLC, exllama2) if they prove to be significantly more optimal?
5. **Tool plugin architecture**: Should plugins support both sync and async functions (for future API/webhook integrations), or just sync for now?

Let me know so I can start the deep research on optimal SST, LLM, and TTS stacks, local-first architecture, model sizes, plugin system design, and lightweight packaging approaches accordingly.
</deep-research-agent>

---

<user>
1. As for now it will be build and tested on a Windows PC. But to ensure a smooth and easy port to other platforms later, we will have to at any point keep in mind that this entire applications later will be made accessible for all three major platforms.

2. We will need to expect users with both respectively. By default the application should check weather a capable GPU is detected, if not, it should just use the CPU. The user has to be able to select the hardware/device he wants to use (e.g. single select CPU/GPU-0/GPU-1 etc.). We need to expect users with any potential hardware: from newest NVIDA graphic cards over computers with intigrated graphics to rather old laptop with only a simple cpu. The application ahs to be fully able to adjust and cleanly do aything needed (without randomly installing big depedencys like new cuda versions of the host machine); in worst case senarios users have to be notified and be presented with actions they need to do/expected to do etc. (e.g. *install ... application/package/dependecny* etc.)

3. Good catch! Dictation by default should be multilingual and should always expect and be prepared for highly technical vocabulary etc. We for now do not need complex functionality (like e.g. functionality to pull in specific file names or function names of a current code base or similar), but this may be kept in memory for later functionality. Also users should also be able to select a STT model tailored for e.g. english which may potentially smaller and faster than a comparable, potentially bigger multilingual model.
3.1 (a feature for the future/later phase...) Users should be to control a *dictionary* of words and phrases the which both dictation agent as well as assistant agent will respect. Users should be able to specify specific words they say often which the STT may misunderstand or mis-interpretate. E.g. something simple would be *"btw <-> by the way"* or similar, but something more complex would be boosting the STT transcription for e.g. a specifc name of a local place or similar which the agent may otherwise would not be able to understand correctly.

4. Yes. Please research this and potentially challange our thoughts on this.

5. Yes, correct. Users should be able to set up tools that are either sync and async functions. By default it should be 'sync' and only 'async' needs to be specified.

Those were good questions I did not yet think about.
Also note that although we will be using Convex as database, we will keep all functionality local and only things like dictation storage and conversation storage, log in and potential other functionality will be handled by Convex + AuthKit and even those are optinally for each user.
</user>

---

<deep-research-agent>
Understood. I’ll begin in-depth research on the most optimal models and frameworks for building a compact, portable, voice-driven AI assistant and dictation tool with full local-first architecture. I’ll focus especially on selecting the best lightweight STT, TTS, and LLM models compatible with various hardware setups, investigating llama.cpp and viable alternatives, and outlining a minimal, extensible tool plugin system. I’ll also evaluate packaging strategies that meet your single-binary portability requirement.

You’ll be able to continue chatting with me while I work on this.
</deep-research-agent>

---

<deep-research-result>
# Local AI Voice Assistant - Models and Frameworks Research

# Overview of Requirements and Goals

We are designing a local-first, voice-driven AI assistant that operates entirely on the user's machine. Key features include two modes - Dictation (speech-to-text with AI cleanup) and Assistant (conversational agent with tool use)- with seamless hotkey switching. The solution must be lightweight, fast,and portable,avoiding complex multi-server setups. All core components (speech recognition,language model, speech synthesis,etc.) should run localy in one package. Below is a summary of the requirements:

- Offline, Local Operation: No cloud services needed for core features. AllAI models (STT, LLM, TTS) run on-device for privacy and offline use.

- Lightweight & Portable: Minimal dependencies and a single cohesive app (no separate backend servers or containers). Easy setup with models downloaded to a known directory (e.g. under user confia or|~/.the-app/models/l).

- Cross-Platform: Initialy targeting Windows, but architecture mindful of Linux and macOS. Use platform-appropriate methods for audio I/O, hotkeys,and clipboard inteqration.

- Flexible Hardware Support: Detect and utilize GPU if available (for speed), otherwise run on CPU. Users can choose the compute device (CPU vs specific GPU)for each model.The app should handle a range of hardware from high-end GPUs to older CPUs by adjusting model sizes/ quantization.

- Two Interaction Modes:

  - Dictation Mode- Push-to-talk voice dictation. On hotkey press,capture microphone input until hotkey released; then transcribe to text and clean/improve the text via an LLM,as quickly as possible.The final text is pasted into the active application and copied to clipboard. Dictation mode has limited tools (by default none,aside from using current clipboard/selection as context).

  - Assistant Mode-Aconversational voice assistant.The assistant listens via push-to-talk and then responds with speech (text-to-speech). In this mode the LLM has a conversation memory and can access enabled tools to perform tasks (e.g.search,open apps) as directed. By default, it includes context like the user's current text selection or clipboard content.It produces a spoken answer (and possiblv also text output).

- Tool Integration: A plugin-like system where users can define Python functions ("tools") in a config file.The assistant's LLM can call these tools to augment its capabilities (for example, web search,controling other apps,etc.). Users can enable/disable specific tools for each mode.The baseapp will ship with a few qeneral-purpose tools as examples.

- Data Storage & Privacy: All live functionality is local. Optionaly users can log in (via AuthKit, e.g. Google/GitHub)to sync conversation and dictation history to a cloud database (Convex). If not logged in, no data leaves the device.No audio recordings are stored.If logged in,each dictation (raw transcript + enhanced text) and each assistant conversation turn (including tool actions)is saved to Convex for history, unless the user opts out. (AllAPI keys or credentials for tools remain local unless the user consents to sync them.)

With these goals in mind, we need to choose an optimal technology stack for the three AI components - Speech-to-Text (STT), Language Model (LLM),and Text-to-Speech (TTS) - along with frameworks for tool use, UI,and overallintegration.The following sections explore each aspect in depth,citing relevant open-source projects and research for guidance.

# Speech Recognition (STT) Engine

For local speech-to-text, OpenAI's Whisper emerges as the top choice.Whisper is a state-of-the-art ASR (Automatic Speech Recognition) model trained on 680k hours of multilingual data ①.Crucialy, it's available open-source and can run fully offline on consumer hardware. Competing ofline STT options (such as Vosk/Kaldi or Mozilla DeepSpeech generally cannot match Whisper's accuracy on diverse, realworld speech.Whisper's advantages align well with our needs:

- Highly Accurate: Whisper achieves strong accuracy across many languages,accents,and even technical jargon, thanks to its extensive training.It handles noisy environments robustly ② . Even smaller Whisper models perform surprisingly well on everyday speech.   
- Multilingual & Technical: It natively supports dozens of languages and was trained on varied content (e.g.web audio),so it can recognize technical terms or code words better than older models.   
- Offline-Capable: Whisper can be run locally. There are optimized implementations like whisper.cpp (C++ port) that make it feasible to run on CPU with reduced footprint.

Whisper Model Size Trade-offs: Whisper offers several model sizes (tiny，base,small medium, large) with a trade-off between speed and accuracy. For a real-time dictation app,smaller models may be preferable to minimize latency. According to one case study,the Whisper tiny model (39 M parameters) gave about ~95% of the accuracy of the largest model while being very fast and lightweight, whereas the medium model was ~99% accurate but much slower and memory-intensive ③ .In that project, the developer chose Whisper-tiny because “waiting kills engagement faster than small transcription errors." 4 .In our context,a similar logic applies -a slightly less accurate transcript delivered instantly is better for user experience than a perfect transcript after a long delay.

By default, we can use Whisper Smallor Tiny (depending on tests) to ensure snappy performance. Whisper Small(244 M params) offers a middle ground (~95-97% accuracy on English vs large) at a stil reasonable speed on CPUs ③.Whisper Tiny is extremely fast on CPU and uses very litte RAM (-low hundreds of MB or less when quantized), which might be suitable for older PCs ③.We willallow the user to switch models (tiny/base/small/etc. or multilingual vs English-only) based on their accuracy Vs speed preference. Notably, Whisper has English-only versions of its models that are slightly faster and smaller than the multilingual versions -if a user only dictates in English,the app could use|tiny.en orsmall.en]model for efficiency.

Optimized Implementation: To keep things lightweight, we avoid the heavy PyTorch dependency of openai/whisper|and instead use an optimized runtime:
- Whisper.cpp - a C++ implementation by Georgi Gerganov, which can run Whisper models with 8-bit quantization and no external dependencies. It's well proven and even supports real-time transcription on CPU.For example, Handy,a Rust-based offline STT tool,uses whisper.cpp with the Whisper Small model to do exactly what we need: "Press shortcut, speak,press again..transcribes with whisper.cpp and pastes directly into whatever app you're using" in a completely ofline, cross-platform way 5.We can leverage the same approach in Python via bindings or subprocess.The whisper.cpp approach also allows GPU acceleration via OpenCL or CUDA if available，and it's been used on Windows,Mac,and Linux successfully 6.
- Alternatively, Faster-Whisper (CTranslate2) or whisper.cpp Python bindings could be used. These provide optimized inference (int8/bfloat16,multi-threading)and are easy to integrate.The key is to ensure the STT engine

can transcribe a tpical sentence or two of speech with minimal lag (ideally a couple of seconds or faster for a short utterance).

Whisper's output will give us the raw transcript. We will run it in transcription mode (not translation) to preserve the original language.(Whisper willauto-detect language or can be forced to a specific language.We must ensure|task="transcribe"|and not default to translating non-English speech to English 7 8,so that multilingual users get output in the spoken language.)

Voice Activity Detection (VAD): Since we plan to use a push-to-talk hotkey for start/stop,a VAD is not strictly required for dictation (the user manually indicates when to stop listening). However, we might incorporate a VAD to enhance usability in the future or for an "auto mode."For instance,Silero VAD is a lightweight, high-accuracy voice activity detector that can detect when the user has stopped speaking 9.This could allow automatically ending the recording after a pause, which “prevents mid-sentence cutoffs and keeps UX natural" 10 . Initially, we'llrelyon the user-controlled hotkey,but keeping VAD in mind is wise (Silero VAD is only ~1.8MB and fast 11,so it wouldn't bloat the app).

In summary，Whisper.cpp (tiny or small model) is the optimal STT choice for its accuracy，offline capability，and proven use in similar projects.This willsatisfy the dictation needs (including technical vocabulary) across multiple languages with minimal footprint.

# Language Model (LLM) for Assistant and Dictation

The LLM is the "brain" of the assistant, responsible for understanding queries, holding conversations, calling tools，and also for refining the raw dictation text. Our requirements for the model and framework include:

- Small Footprint, Fast Inference: The model should be smallenough to run on consumer CPUs (and optionally GPUs) with low latency.We likely need a model in the~1B to 7B parameter range, heavily optimized (quantized). Using a huge 13B+ model would strain most users'hardware and slow down responses.   
- Reasonable Conversational Ability: It should handle general questions and simple conversations ("light conversational help"), folow instructions,and possibly do basic reasoning or tool usage.While we don't expect ChatGPT-level prowess from an ofline model,it should be "good enough" for productivity tasks and text enrichment.   
- Tool-Facility: The model or our prompting strategy should accommodate an agent-style use of tools (the ability to output a special token or text indicating a tool cal, or be guided to do so by a prompt).   
- Context Length: Ideally a moderate context window (at least 2k tokens). Long conversations or large documents might be truncated,but ~2048 tokens is a baseline.Some newer small models support 4k or more,which would be a plus for including clipboard context or conversation history.   
- Modes Alignment: Option to either use the same model for both Dictation and Assistant modes, or possibly use an even smaller/faster model for dictation cleanup if that yields a benefit. However, loading two different models back-and-forth would be inefficient,so it's preferable to pick one model that can handle both tasks.

Given these, using a LLaMA-family model via llama.cpp is a strong choice. Llama.cpp is a backend similar to whisper.cpp,optimized for local inference of LLaMA and related models 12 .It alows running models with minimal dependencies (just a single C++ library) and supports various quantization schemes to drastically reduce model size and speed up inference.

Why llama.cpp (GGML/GGUF models): This approach aligns with the one-package goal. We can ship a quantized model file and use lama.cpp's Python binding (like|llama-cpp-python) -to load and run it in-process - no separate server needed.This was demonstrated in multiple projects: -The offline student assistant project used a quantized LLaMA model(~2GB)on CPU,achieving response times of ~6 seconds 1314 .They emphasize that quantization provided a 14x reduction in memory and 8× speedup with only ~10% lossin quality 15 - a very worthwhile trade-of.- Another guide suggests using CTransformers (a similar library)to run a TinyLlama 1.1B model eficiently on CPU 16 17 . TinyLlama is an even smaller model aimed at low-resource devices.- The medium article on grammar correction used|llama.cpp with a 7B model (Mistral 7B MoE) as a "local Grammarly" for fixing text 12，underlining Iama.cpp's suitability for text refinement tasks as well.

Model Selection: We need to pick a specific model (or a few candidates) that best balance size and capability: - LLaMA 2 7B Chat - A strong baseline. LLaMA-2 7B (especialy the fine-tuned "Chat" version) is one of the most capable models in the~7B range as of 2023.It's trained on assistant-style dialogues and can follow instructions, making it suitable for both modes. Quantized to 4-bit (using llama.cpp's Q4 0r Q5 K quantization), it can fit in ~3-4 GB of RAM 13 . On CPU,it might generate ~5-10 tokens/sec (depending on CPU speed and quantization), which is okay for short outputs (a sentence or two in a couple seconds). With a GPU (even a 4GB VRAM card),it could run much faster by offloading layers.- Mistral7B-A newer 7B model (released late 2023) known for strong performance.Mistral 7B is trained on a large diverse corpus and often outperforms LLaMA-2 7B.Importantly,the Mistral model supports 8k token context by default, which could be great for feeding it longer context (like a big clipboard or more conversation history) without immediate truncation.A quantized Mistral 7B (for example,the Mistral 7B Instruct or OpenOrca variant) would be a top contender if licensing and integration are feasible. Quantized size would similarly be ~4GB or less (and possibly memory-efficient since Mistral is 7B). - Smaller alternatives (2-4B range): If we find 7B stilltoo slow for older machines, there are a few smaller models: e.g. TinyLlama 1.1B (a research model focusing on long context),or RedPajama-3B or GPT-J6B (older). However， these smaller models usually have significantly lower accuracy and knowledge.TinyLlama 1.1B,for instance，can run on CPU very easily but will struggle with complex instructions or fluent conversation.It might be usable purely for dictation cleanup (grammar/ punctuation) since that is a narrower task. In one offline voice assistant, TinyLlama-1.1B was used as the "brain" for basic Q&A 16 ，but that likely limits the assistant's inteligence.We prefer to aim for ~7B as the main model and only fallback to a smaler one if absolutely needed for performance.- Other 7Bclass models: There are fine-tuned variants like Vicuna-7B,Alpaca, OpenAssistant 7B,etc.,and also domain-specific ones (e.g. CodeLlama for code). Given our use-case is general and multi-purpose,a well-rounded instruct model is ideal.LLaMA-2-7B-Chat or a Mistral-7B-Instruct fits that description. These models handle a mix of casual conversation and factual instructions reasonably well Another interesting model is Qwen-7B by Alibaba，which reportedly is strong and has 8k context，but its availability/compatibility with Iama.cpp needs checking (there are GGML conversions of Qwen-7B,but license is more restrictive). - Future flexibility: The framework will allow users to swap in any GGML/ GGUF model they want (as long as it's an LLM that fits context and capability needs).We will document how to drop a new model file into the models directory. This way advanced users can use a larger model (e.g.LLaMA-2 13B or 70B quantized)if their hardware permits，or an entirely different architecture supported by lama.cpp (GPT-J, MPT,etc.).By default,though,we willikely ship or autodownload a 7B-ish model quantized to around 4-bit,to serve as a sane default for most users.

Memory and Speed Considerations: A 7B model in 4-bit requires roughly 3-4 GB of RAM and can run on pure CPU in a reasonable time frame (a few tokens per second). If a user's machine has 8+ GB RAM and a modern CPU,this should be fine.For users with very low RAM,we might offer a "low resource mode"using a smaller model (e.g.3Bor 1B)- albeit with reduced capabilities. Quantization is key here: as noted,quantizing LLaMA 7B from FP16 (~13-14 GB) down to 4-bit or even 3-bit can shrink it to a couple gigabytes,at some cost to output quality 15 . Empirical results show quantized LLMs retain a

high degree of their original accuracy (the student-assistant project reported only~8-12% quality drop for a 14x size reduction 14 ). We can also use the latest quantization strategies (like GPTQ or AWQ) if available to maximize speed/quality trade-off.

Using the LLM in Dictation Mode: In dictation mode,the LLM's job is primarily to polish the transcribed text.This includes adding punctuation/capitalization，fixing obvious ASR erors，and possibly rephrasing slightly for clarity.This is a relatively constrained task compared to open-ended question answering. It means even a smaler model could handle it, but since we willikely have the main model loaded anyway,we can simply prompt it with an instruction like: "Correct and enhance the following dictated text, without changing the meaning"and provide the raw transcript.This is similar toa grammar-fix or writing-improvement prompt which 7B models can do reasonably well In fact, one Medium article used a local Mistral-7B model specifically as a grammar corrector (a "local Grammarly") and it performed effectively for that purpose 12 18 .We can take inspiration from that approach.

It's worth noting that Whisper already outputs punctuated text (for languages like English) with its internal model, but Whisper's punctuation and casing can be imperfect.The LLM can refine that further (e.g. ensuring proper nouns capitalized,spliting run-on sentences,etc.). If the LLM fails or takes too long for some reason,we willstillhave the raw Whisper transcript as a fallback to paste so the user doesn't lose their dictation.(Users might also disable LLM enrichment if they prefer raw transcripts for maximum speed).

Using the LLM in Assistant Mode: In assistant mode,the LLM willengage in multi-turn dialogue with the user. We will maintain a conversation history (recent turns, possibly summarizing older context if needed to stay within the token limit).The model's system prompt can be something that establishes its persona and available tools.For example: "You are α local AI asistant. You have αccess to the user's clipboard,selected text,and the folowing tools: [tool list].You willanswer the user and use tools when necessary."Then we prepend the conversation history of user and assistant messages.This setup is similar to how ChatGPT-style models operate.

Given the small context window (if 2k tokens), we will have to be mindful to trim history. A guideline from an ofline assistant project wasto "trim context after~10 turns to avoid memory isues" 19 for small models.We can implement a rolling window or summary strategy for long dialogues.

Tool Use and Agent Framework: We will detail this more in the next section, but from the LLM's perspective, tool use can be prompted by instructing the model on a format (e.g.a ReACT style or function-caling style prompt where it can output an "Action"). Many open-source instruction-tuned models can follow a format like:

Thought: I should search for relevant info.

Action: SEARCH("query")

with the right few-shot prompt. The challenge is that our model is small,so it might not perfectly adhere to a complex format. Simpler approaches (like checking the model's output for certain trigger words or requiring the user to explicitly invoke tools) might be more reliable initially.Nonetheless, it is known that even 7B models (especially ones fine-tuned for multi-step reasoning like WizardLM or OpenAssistant) can do basic tool use if guided.

Libraries like LangChain provide out-of-the-box agents that could use our LLM and a list of tools, orchestrating areasoning loop.For example, LangChain's|initialize_agent|can take a list of tool

functions and an LLM,and it uses an LLM-driven loop (with a standard prompt) to decide on actions. This is certainly an option - LangChain has been used with local models for similar tasks 20 . However, incorporating LangChain adds some complexity and overhead.Since we want to keep things minimal, we might implement a lightweight custom agent: essentially, after the LLM produces an answer, we scan if it contains a tool invocation (perhaps demarcated by special tokens ora known pattern)and then execute the corresponding tool function in Python,inject the result back,etc.This custom approach would be tailored to our format and likely more understandable to users who want to modify the tool definitions.

Summary: We will use Ilama.cpp as the LLM backend, with a default model around 7B parameters (e.g. LLaMA-2 7B Chat, quantized).This gives us a good balance of performance and capability for on-device use.Quantization and eficient runtime (GGML) will keep memory usage low (~4GB or less) and allow CPU-only operation. The same model will serve both dictation cleanup and the assistant's conversational needs,to avoid loading multiple models.We'l provide options to change model or quantization if the user needs to tune for their hardware.This approach has been validated by recent projects demonstrating fully offline assistants: e.g.,a 2GB quantized LLaMA could run 100% locally and respond in ~6 seconds on CPU 13 14 and another project successfully used a 1.1B model for a basic voice assistant on CPU 16 . Our solution with ~7B should be even more capable while still within feasible runtime on a modern PC (and much faster if a GPU is present).

# Text-to-Speech (TTS) Engine

For the assistant to talk back to the user we need a local TTS system that converts the assistant's text responses into audible speech.The TTS component is crucial for a good user experience - a natural, clear voice is highly desirable. In fact， one ofline assistant developer noted that using a robotic-Sounding voice initially "turned out to be α bigger problem than accuracy," and improving to a warm, human-like voice kept users far more engaged 21 .So, we should strive for a high-quality TTS output, within the constraints of local operation.

Key requirements for the TTS engine: - Natural Voice Quality: We want the speech to sound as fluent and human-like as possible, not like old-generation robotic TTS.This improves usability especially for longer conversations.- Low Latency: Generating the audio should be relatively fast (a few seconds at most for a sentence or two),so that the assistant's reply doesn't feel sluggish.- Lightweight/offline: All processing local. Preferably use a pretrained model that isn't too large and doesn't require giant frameworks.We should avoid cloud APIs and even large local servers.- Multi-language Support: Ideall the TTS could handle multiple languages,or at least we provide a way to use diffrent models for different languages if the user switches language.

Several open-source TTS solutions exist. Notably: - Kokoro TTS-an 82 milion parameter Transformer TTS model released in 2O25，known for being small and eficient yet high-quality. Kokoro can generate very natural speech and has multiple voices.It's available as an ONNX model.In fact, Kokoro is specifically designed to be "smal. delivering natural sounding speech on a Raspbery Pi" 22 ．The quantized Kokoro model is only~80 MB(l) 22,which is incredibly lightweight. One project using Kokoro reported “natural& warm"voice quality and ~1.2s generation time per sentence on CPU 23 .This is a strong endorsement for Kokoro - it meets our quality and speed goals. Kokoro supports English and possibly other languages via different voice files (it has a separate voice data file with many voice presets, such as the "af_heart" voice used in an example 24 ).- Silero TTS - a set of compact TTS models (by Snakers4) supporting about 20 languages.Silero models are known for good quality too - one comment noted their TTS is “top notch and close to state ofthe art." 25 Each Silero voice model is relatively smal (dozens of MB)and runs in real-time on CPU (requires a machine with AVX2 support) 26 .There are pre-trained

voices like en_v3 for English (multiple voice options),and others for Spanish,French, Russian,etc. Silero could be a great option especially for non-English users,since Kokoro's multilingual support is less proven.The downside is Silero TTS is typically used via PyTorch models (though they are not very large,using PyTorch might complicate packaging unless We convert to ONNX). - Piper (Rhasspy)- Piper is another lightweight TTS system which is essentially an efficient wrapper around some fast TTS models (based on FastSpeech2 + HiFiGAN). Piper provides pre-trained voices too,and can run on CPUs quickly,including on Raspbery Pi. Piper models are on the order of 50-300 MB.It was an improvement over older eSpeak in the Rhasspy voice asistant project. Piper's voice quality is decent,though perhaps not as natural as Kokoro's or Silero's latest. - Bark by Suno - Bark is a powerful neural TTS (supports tonal languages,even singing and non-English),but it's extremely heavy (even the "small" version is hundreds of MB and requires a GPU for reasonable speed) 27 28 .Bark also tends to be slow on CPU and would add a large dependency (requiring PyTorch and Transformers library).This conflicts with our lightweight goal. While Bark can produce very expressive speech,it's likely not viable here due to resource constraints.- OS Built-in TTS - using the operating system's native TTS voices (e.g. Windows has some, macOS has Siri voice, etc.).This would avoid shipping any model, but the quality and voices available vary greatlyand we'd lose cross-platform consistency. Also,those voices are not AI-generated and may sound robotic or have licensing issues for continuous use.We prefer an open model we can ship or download.

Recommendation - Kokoro TTS as default: Kokoro TTS appears to be an optimal default choice for an English voice: - Itstrikes an excellent balance of size and quality.As one blog noted,"the quantized model weighs ~80MB...Iprefer Kokoro's more natural voice [over eSpeak/Piper]" 2 . That means we can include or easily download this model without bloating the app.- It runs on CPU in near real-time.The developer of the student asistant got ~1.2 seconds latency for generating an answer's audio 24，which was actually faster than the LLM's text generation in that pipeline.They also specifically highlighted how much more pleasantthe "natural & warm"voice was for students 24 .- The Kokoro project provides multiple voice presets*(male/female,different accents).For instance,"af_heart" is an American female voice that was used in examples 29 .We could let users choose from a few included voices to suit their preference.- Kokoro's inference can be done via the kokoro-onnx Python package 30 ，which wraps ONNX Runtime for the model. ONNX Runtime is a relatively smalldependency and can use CPU or even GPU. Using an ONNX model means we avoid needing the full PyTorch package at runtime.This helps keep the app lightweight and self-contained.

For other languages or if users want variety, we can consider Silero TTS models as optional downloads. Silero's latest models (V3) cover many languages (English, Chinese,Russian,French,German,etc.）31 and are optimized for CPU.We might not ship them by default,but could provide a setting to use Silero if the user prefers,or auto-download a Silero model for a detected language.For example,if a user is dictating in German and wants the assistant to respond in German, Kokoro might not have a German voice, but Silero hasa German model.Silero voices are about 3oMB each and produce quite high-quality speech as per community benchmarks. One thing to watch is that Silero's default sampling rate difers (maybe 24kHz)- but we can resample if needed. Kokoro uses 24kHz output too,so we should ensure the playback is at the correct rate (one dev had to resample Whisper's 16k output to 24k for Kokoro to avoid distortion 32 ).

Performance: Generating speech for, say,a 20-word sentence likely involves outputting a few thousand audio samples - which these models can do in a second or two on CPU.In practice,TTS willnot be the botleneck; the LLM's text generation will likely take longer for each response.In an observed benchmark,the LLM took ~5-6 seconds whereas TTS was “surprisingly good"and faster 33 .We could further optimize by starting TTS generation while the LLM is stillfinishing its text (streaming).A future improvement could be to "stream LLM tokens directly into TTS (cut latency to ~3s)" 34，meaning as the

model generates text token by token，start synthesizing speech incrementally.This is complex to implement but worth noting for down the road.

For now, the straightforward approach is fine: once the LLM produces the ful reply text, pass it to the TTS engine (Kokoro ONNX) to generate audio,then play the audio through the system output. Well use a Python audio library (such as|sounddevice|or|pyaudio)to play the NumPy array of samples that Kokoro returns 35 36 .This avoids writing to a file unless needed for debugging. We'llalso include a brief sound (like a soft chime or beep) to indicate the assistant is about to speak or when dictation recording starts/stops,for user feedback.

Summary: Kokoro TTs is the primary choice for a high-quality，efficient TTS engine in our app. It provides a near state-of-the-art voice with a tiny footprint, fulfilling the need for a "lean UI, OpenAIlike" polished experience.As backups or alternatives, Silero TTS models can be supported,especially for non-English responses.Both options keep everything local and run in real-time on CPU.By using ONNX or similar lightweight runtimes,we ensure the TTS doesn't drag in heavy dependencies. Users will appreciate the assistant speaking in a natural voice that makes interactions feel smooth and not "robotic."

# Tool Integration and Agent Design

One of the defining features of this assstant is its tool-augmented capability - the ability to perform actions or fetch information via user-provided tools. Designing this requires both a framework for adding/integrating tools and an agent logic for deciding when to use them.

Tool Definition: We plan to let the user define tools in a Python file (e.g.tools.py). Each tool is essentially a Python function (sync or async) that the agent can call.For example,a user might write a function|def search_web(query: str） -> str: that uses an API or web scraper to return search results,ordef get_selected_text(） -> str:|that returns the current text selection (our app can provide this context).The agent should have a way to invoke these functions during its reasoning.

Integration Approach: To keep it simple, we can load the|tools.py|module at startup, gather the functions in a dictionary (with their names and docstrings),and expose them to the LLM via the prompt. Forinstance，we might include in the system prompt a list like: “Tools you can use: search_web(query) - searches the web for the query and returns results;|get_time()|- returns the current time;. along with usage examples.This way the model is aware of their existence. When the model "decides" to use one, it could output a special token or format.

There are a few design patterns we can use: - ReAct (Reason+Act) Prompting: This is where the model generates a thought process and explicitly outputs an Action and an action Input. LangChain uses this method.For example:

Assistant: I should check the user's notes for that info.

Action: open_obsidian("project notes")

Our code would detect the line starting with|Action: and parse out the function name and argument. It would execute the corresponding Python function,get the result,and then feed it back into the model (e.g.,as an observation,and ask "Anything else?").The model then continues.This loop continues until the model decides to output a final answer rather than another action.

This approach can be implemented manually or via LangChain's agent framework. LangChain would handle parsing and looping if we provide tool objects (each tool with a name,description,and a function to cal). Using LangChain might simplify initial development, but it adds a dependency and some overhead.A custom loop is feasible given we have fullcontrol and a limited set of tools.

·Function Calling (a la OpenAI API style): In this approach,we intercept the model's output tokens as they are generated and look for a pattern that indicates a function callin JSON.This is how OpenAI's function caling works (the model emits a token sequence that, when parsed, is a JSON indicating a function name and arguments). Some open-source models fine-tuned on such data (e.g., OpenAI function caling format) might output a|<function>|tag or similar. This is somewhat advanced and requires the model to be aligned with that format.With a 7B local model, we likely don't have that specialized fine-tune.   
· User-Guided Tools: Alternatively, we might initially keep tool usage manual or user-triggered. For example,the user could ask,"Search for XYZ" and the system can detect the word "search" and automatically use the search tool rather than asking the LLM. However, that reduces the generality (the LLM might not proactively suggest tools itself). We probably want the agent to handle it autonomously if possible.

Considering our model is not extremely large，a full autonomous agent with complex multi-step planning might be britle.A pragmatic approach is: 1. Include Context by Default: The assistant will automaticall include certain info in its prompt, such as the current clipboard text or selected text in the active app (we can retrieve this via OS APIs).This way,the assistant has some extra knowledge of what the user might be referring to without needing a tool call. (The user did mention both modes having context of selection/clipboard by default.）2. Simple Tool Triggers: For the initial version,we could implement straightforward triggers.E.g.,if the user's query explicitly says "search for X"or "open my calendar", we can intercept that and callthe corresponding tool,then feed the result into the LLM's context (like: Tool result: {result}).This requires some pattern matching, but ensures important tasks (web search,etc.) happen reliably.3. Agent Loop for Advanced Tools: For more complex or proactive uses,we can implement a ReAct loop as described. Given that similar projects have done this with llama-family models,it's doable.We'll need to carefully craft the prompt.For example,the system prompt might contain:

You have access to the following tools:

1. search_web(query） - Search the web for the given query. Returns a summary of results.   
2. get_weather(city) - Get the current weather for the city.

Use the format:

Thought: (you think about what to do)

Action: function_name("argument")

Observation: (the result of the action)

Thought: ...

Final Answer: (your answer to the user)

This few-shot style has been shown to work on modelslike LLaMA-2.The model may follow it. If it doesn't,we can fine-tune the approach.

We wilikely start with a baseline set of tools for general use, possibly: a web search (if internet access is available- though the app is ofline-first,we could allow an optional search tool using an API like DuckDuckGo if user provides API key or if they run a local search),a calculator/math tool,maybe a file system or notes query (if the user uses Obsidian or has local notes,though that might be userprovided). The user specifically mentioned possibly connecting to an external "docker MCP gateway" running tools like DuckDuckGo search or Obsidian integration - our architecture will allow that by simply calling those APIs through a toolfunction.We just need to be sure to make it easy to extend.

Modes and Tools: In Dictation mode,most tools willbe disabled by default (to avoid the LLM doing something unexpected when the user is just dictating text). Only possbly the clipboard/selection context is used.The dictation LLM prompt willbe constrained to "just correct this text"- so it shouldn't be trying to do actions anyway.In Assistant mode,alluser-chosen tools are available.We will provide a UI toggle or config where the user can mark which tools the assistant can use (for privacy or control - e.g. some might not want it always hitting the web unless they say so).

Security-wise,since these tools are essentially arbitrary Python,and the LLM could potentially execute any allowed tool,we consider the user to be in control of their own tools.We should caution users that if they add a destructive tool(likeadelete_filefunction)and give theAIfree rein,it could in theory callit. So users should only add tools they trust the AI with,or keep certain dangerous tools disabled unless needed.

In summary,our plan is to implement a lightweight agent loop for tool use,inspired by ReAct prompting, without heavy external dependencies.We wil test it with our chosen model to ensure it behaves. If needed,we can use LangChain's agent as a backup plan (since LangChain can work with llama-cpp models 20 ). But given the aim of simplicity, we prefer a direct approach.

Finally,we will make sure to document how to add new tools (edit the Python file)and perhaps in the future build alitle UI to manage them (e.g.,listing available tool functions and alowing the user to enable/disable or input API keys for them).This pluggable tool design makes the assstant extensible, which is a big selling point for power users.

# User Interface and Interaction

While the core could technicall run headless (listening for hotkeys and operating in the background), a small GUI will greatly enhance usability. The UI can provide visual feedback (transcriptions, conversation text, status of listening), settings toggles,and access to history. The user suggested a "simple,very clean UI(like one made by OpenAI)"- likely a minimalist chat window and some menus.

CLI vs GUI: A pure CLI or tray app would be more minimal, but harder for users to configure and monitor. Given we want to possbly incorporate login (Auth)and display conversation history,a GUI is justified. We should keep it lightweight and cross-platform.Two main approaches are considered:

·Electron (web-tech UI): Using Electron (JavaScript/HTML/CSS)to create a desktop app.This would allow us to use React + Tailwind CSS + shadcn/UI components as mentioned.We can design a chat-style interface and settings pages in React,achieving that polished look and familiarity. Electron is heavy in terms of bundle (it includes Chromium), but we can keep the interface minimal so the overhead is mainly the fixed cost of Chromium (~100MB RAM).Since our app already might use several hundred MB for models,an extra 10oMB for UIis acceptable on a desktop. The advantage is rapid development and a unified codebase for UI across OSes.

·Tauri or Native frameworks: Tauri is an alternative that uses the system webview(reducing bundle size)and Rust for the backend.We could potentially compile our core logic as a Rust or use Python via a sidecar. However, this complicates integration with our Python-based model stack.Another option is PyQt or Kivy (pure Python UI), but those Would not easily achieve the "OpenAI-like" design and can bloat package size too. Given the user specifically referenced web UI libraries (tailwind,shadcn), Electron or a local web app is the likely path.

Architecture with Electron: If we use Electron,we'lhave two processes -the Electron main (Node.js) and the Python backend.We need them to communicate.There are a few ways: - Run the Python backend as a separate process (launched when the app starts) and communicate via IPC or HTTP. For example,the Electron app could spawn the Python script (which loads models)and then talk to it via a local HTTP or WebSocket.We could implement a lightweight REST API (with FastAPI or even an RPC socket)that Electron cals for actions like "start listening","stop listening",etc.，and get transcripts or responses.This is somewhat similar to how some setups run (web UI + local API). But it does introduce a local server component (though confined to localhost).- Alternatively,use Electron's|node-ffi ora bridging library to call Python functions directly.This is tricky; more commonly one would embed Something like a Python interpreter in Node or vice versa.A simpler approach is the separate process method. - There's also Electron + PyInstaller route: where you package the Python app as an executable and have Electron communicate via stdio (like how VSCode's language servers communicate with an editor).For example,send JSON commands to the Python process's stdin and read stdout responses.

Given that performance isn't real-time critical for the IPC (the heavy lifting is within Python anyway), a straightforward plan is: - Launch a background Python process at app start (or have Electron start it on demand).- That Python process runs an event loop (maybe just listening on a local socket or pipe). We can implement a simple RPC: e.g., Electron sends a command "listen_start" -> Python starts recording audio;"listen_stop"-> Python stops and returns the transcribed& processed text.- ForTTS,Python can either send audio data to Electron to play,or simply play it itself (since it can accessaudio device too).If we want to show a visual indicator during speech (like a waveform or at least a "Speaking.." status), Python could notify Electron when it starts and finishes speaking.

Another possibility: use a purely web-based UI(HTML/JS) that the Python app serves via a local HTTP server, so the user opens it ina browser.This would avoid bundling Electron.Frameworks like Streamlit or Gradio can do quick UIs，but customizing them to our needs and hotkey integration might be limiting. Electron gives more control, including capturing global shortcuts.

Global Hotkeys: We need system-wide hotkeys for: - Toggle Dictation mode recording (press to start/ stop).- Possbly another to directly ask the assistant (though we could use the same key and just determine mode via a switch in the UI or a prefix command).- A hotkey to switch modes (or we can do mode switching via the UI or a voice command, but a hotkey is simpler: e.g. Ctrl+Alt+H to toggle between assistant vs dictation mode for the next use).

Electron has a|globalShortcut|module that can register hotkeys on all platforms.That's convenient. If we stick to Python only,we would uselibraries like|keyboard](Windows)and separate logic for Mac/ Linux.It's doable,but might require OS-specific code and permissions (especially on macOS where intercepting keys requires Accessibility permissions). Since an Electron app is a proper desktop app, users can grant it those permissions more naturally if needed.

Thus，Electron with globalShortcut willikely manage the hotkey and then instruct the Python backend to start/stop recording.For example,when user hits the dictation hotkey, Electron tells Python

"start recording (mode=dictation)".When pressed again,"stop recording".The Python backend will ten run Whisper on the recorded audio,run the LLM for cleanup,and then simulate paste of the result.

Pasting into active window: This is a bit of an OS hack,but it's exactly what the Handy tool did and what we want. On Windows,the Python backend (or Node) can send a Ctrl+V keystroke to paste (since we already copied the text to clipboard).There are libraries like|pyautogui|orpywin32|for sending keystrokes. On Mac, we might use AppleScript or Quartz events to paste,and on Linux X11,|xdotool or similar. Since Electron is already for UI,an alternative is to have Node handle the paste via an OSspecific node library for simulating key events.But doing it in Python is fine too ifwe find cross-platform methods.

One robust approach: put the text in clipboard (Python can do that easily,e.g. using[pyperclip) then simulate a Ctrl+V.If the user's focus is ona text field,it will insert.We should also consider that on macOS the paste shortcut is Cmd+V,so handle that accordingly.

UI Features: The UI willikely have: - A simple window that perhaps lives in the system tray when not used. Possibly the assistant could be mostly used via voice/hotkey without opening a window often,but the windowis there for configuration and viewing history.- Chat view: Show the conversation with the asistant (in assistant mode). We can show user queries and assistant responses (and maybe which tool was invoked,for transparency). - Dictation view/log: Maybe a minimal view or just a notification that dictation happened and text was inserted.We could log recent dictations in a panel,in case the user wants to retrieve something they dictated earlier (especially if not logged in to cloud history). - Settings: Allow changing models (choose a Whisper model size,choose the LLM model from those available, select a voice for TTS,set hotkeys,enable/disable tools,etc.). Also set the model directoryif they want to store models in a custom path.- Login/Account: If using Convex Auth,a section to log in/out and maybe display whether history is being synced.- Possibly an overlay or indicator when listening.Some voice assistants show a smalloverlay icon or color change when actively recording.If we can,showing a lite microphone icon in the corner or in the tray that turns red while recording could be nice.If not, a subtle sound (beep) on start/stop and perhaps a toast notification "Recording.." could suffice.

The UI style should be clean and simple: likely a white or dark background with rounded corners, minimalistic elements - to mimic ChatGPT's interface.We can use Tailwind Css for quick styling and shadcn/ui (a component library based on Radix UI) for nice prebuilt components like switches, dialogs, etc.

Cross-platform UI differences: We should ensure the UI layout and fonts adapt to different OS. Electron handles most of that, though on macOS we might need to adjust the globalShortcut usage (Cmd vs Ctrl).Also,packaging the app for each OS willbe separate steps (Electron-builder can create an .exe for Windows，.app for Mac，etc.).We also have to bundle the Python backend in those distributions.

Packaging Everything Together: This is a challnge but solvable.We have a few moving parts: Node/ Electron code and Python code (with model files). One approach: - Use something like PyInstaller or Nuitka to freeze the Python backend into an executable.This could include the necessary Python packages (lama-cpp,etc.)and we can bundle model files or have them downloaded on first run.The Electron app can include this exe and run it.- Or use Electron Forge/Builder with a hook to package the Python files and an embedded Python interpreter. There is precedent (for example,some Electron apps bundle a python or java backend).- We have to be careful that models(which could be gigabytes) are not unnecessarily copied multiple times in the installation.Likely we willnot include a large model in the installer by default; instead,on first launch,the app can download the default models (Whisper tiny,

LM 7B,Kokoro voice) into the user's model directory. This avoids shipping huge installers and lets users opt out of certain downloads.We can maybe include Whisper tiny since it's only ~75MB,and Kokoro quant (80MB) by default,and prompt the user to download the 7B LLM (~3GB)on first run or upon enabling assistant mode.

·We willdefine a default model path (like|~/.config/voice-assistant/models/or on Windows %LOCALAPPDATA%\VoiceAssistant\models\).The app on startup checks if the required model files exist. If not, it offers to download them (possibly showing a progress bar). This is similar to how many apps handle large ML models.

Authentication Integration: AuthKit + Convex likely implies the UI willhave a login screen or popup (probably OAuth with Google/GitHub).AuthKit is a solution for authenticating with Convex backend easily.We might implement the login in the React front-end using AuthKit's React hooks,since Convex has a JavaScript SDK for the browser. Convex can then be used directly from the front-end to store or retrieve history.Alternatively,the Python could upload conversation data via an API callto Convex,but it might be simpler to let the front-end do it (given Convex is often used with web apps).We will ensure that if the user is ofline or not logged in,the absence of Convex doesn't affect functionality- it just won't save to cloud.

Summary: We willbuild a minimal Electron-based GUI.This provides cross-platform compatibility and a modern look using web technologies. The GUI will manage hotkeys and user interactions,while a Python backend process handles the AI heavy-lifting. They will communicate via an IPC mechanism (likely local HTTP or messages).This separation keeps the UI responsive and the AI logic contained. The UI offers the user controls and feedback: mode switching,indicating when listening is active (perhaps a flashing mic icon or sound),showing transcribed text, and the assistant's responses.It will also include configuration (models,device selection,tool toggles,etc.). By keping the interface simple and focusing on core interactions,we can deliver a good UX without overwhelming the user. Many of these design choices are informed by prior projects -for instance,the Handy tool proved that a no-frils UI with just a global hotkey can work wellfor dictation 5，and we are essentially extending that concept with a richer assistant feature set.

# Data Storage and Privacy

Allreal-time operations are local,but we have the option to store conversation and dictation history for users who want cloud backup.The plan is to use Convex (a hosted zero-setup database) coupled with AuthKit for authentication. Here's how we envision it:

· If the user logs in (via Google, GitHub,or email through AuthKit's UI), we obtain their identity and can associate their data in Convex with their account.The assistant would then upload each dictated text (raw + corrected) and each conversation turn (user message,assistant reply, any tool actions)to Convex.This can be done by calling Convex functions (Convex provides an API or SDK to call a function that writes to the DB).The data model might have tables for|Dictations and|Conversations|(with conversationID, turn,etc.).   
·The UI can then retrieve past conversations for display.For example,the user could open a history panel to see what they dictated last week,or continue a previous conversation. This is a nice value-add but not essential for MVP.   
· If the user is not logged in or explicitly chooses not to sync, then no data leaves the local machine.We will still keep transient state locally (for example,we might still write recent conversation context to disk in a cache to maintain state if the app is restarted,unless we choose not to for privacy). But by default, without login, we won't save transcripts permanently (except perhaps a rolling buffer for the UI display).

We will tore local settings (like config,selected options,tool list)in a config file undera directory such as ~/.config/our-app/(Linux/macOS) or %APPDATA%\OurApp\(Windows). This ensures userspecific setings persist between runs.This directory can also hold the user'stools.py|file if we don't want them to dig into the installation folder.

No Audio Storage: We willnot record audio to disk by default. Audio from the mic will be streamed to Whisper and discarded after processing.This is important for privacy. (We might only consider saving audio if we implement some feedback feature like re-processing last audio,but even then,it could be kept in memory or a temp file that's deleted.)

Clipboard and Selection: The assistant will read the user's clipboard and current selection as context. We should mention this in documentation for transparency.These could contain sensitive info,so if the user doesn't want the AI to see that,they should disable that feature.Since everything is local, it's not leaving the machine, but it's still the AI reading it.

Privacy Considerations: Because the entire stack runs localy, the user's voice and data remain private. Even the LLM and STT models are local,so unlike Sirior Google Assistant, no speech is uploaded.We should highlight that as abenefit.For those who log in and sync history,they are choosing to send text (not audio)to our Convex database,presumably encrypted in transit and stored securely.We won't ever upload audio orany other files. Convex willjust have text conversation logs, which the user could delete if needed (we can implement a simple"wipe data" function by caling a Convex function to clear that user's records).

Performance Logging: We might collect some usage metrics locally(like timing how long transcription or LLM took)to show in debug or to inform the user if a model istoo slow.But none of that wil be sent out (unless we later add an opt-in analytics, but likely not needed).

In essence,the app can be used completely ofline with fullfunctionality.The cloud account feature is purely optional for convenience.We willmake sure that the user experience doesn't degrade without login - they just won't have a persistent history across sessions (though we might still keep the current session conversation in memory until the app is closed).

# Cross-Platform and Hardware Support

From the ground up,we intend to support Windows,macOS,and Linux. During initial development, Windows is the focus (since that's our test environment), but we'll keep an eye on portability:

·Audio I/O: For microphone capture and speaker output, we will use libraries that are crossplatform.For example,the|sounddevice|Python library works on Windows, Mac, Linux (it uses PortAudio under the hood).We can also consider|pyaudio(also PortAudio-based).These will capture 16 kHz mono audio for Whisper and play back 24 kHz stereo/mono for TTS,etc.On each OS,the default input/output devices willbe used (or we could allow user to choose device if needed).   
· Hotkeys and OS Integration: Electron's globalShortcut should abstract away the differences. On Mac, we must ensure we don't use a shortcut that conflicts with system shortcuts and that the user grants Accessibility permission to capture keystrokes.We'lprovide instructions if needed (similar to how other apps ask for permission for qlobal hotkeys).   
· Clipboard/Selection Access: On Windows, we can use pywin32 or ctypes to get the current foreground window's selected text (potentially via sending a copy command to that app - risky) or more simply,rely on the user copvinq text to clipboard if thev want it considered.Actually, a

simpler method: if the user has some text selected and hits the assistant hotkey,we could have our app send a Ctrl+C first to copy it to clipboard,then we have it. But that could overwrite their clipboard.Alternatively,on Windows and Linux,there isn't a straightforward way to directly read selected text from another app without simulating copy. On macOS,there are services to get highlighted text in the UI.This might be a tricky area.We might initiallyonly use the clipboard (whatever is currently in clipboard) as context,and later figure out selection.Well document that to get the most context, the user should copy the relevant text before asking the assistant.

· GPU Acceleration: If a user has a supported GPU, we want to take advantage of it for speed:   
· For LLM (llama.cpp): We can compile llama.cpp with CUDA support for NVIDIA GPUs, or with Metal for Mac (to use Apple Neural Engine /GPU), or with OpenCL for AMD.The|1lama-cpppython binding can offoad certain layers to GPU (user can specify the number of layers or fraction of model to load on GPU). Wellinclude an option like "GPU Layers = X" or a simple toggle "Use GPU if available"which under the hood tries to offload 50% of layers to GPU for example.If GPU is not available or something fails,it should fallback gracefully to CPU.We have to ensure the distributed package of llama.cpp is built to support these (we might need to include multiple binaries or compile at runtime? Possibly ship separate builds or use something like pip install 1lama-cpp-python[cuda]). Wellfigure out packaging details - maybe detect NVIDIA and instruct user to install a CUDA enabled module.   
·For Whisper: whisper.cpp also has OpenCL and CUDA options.We can similarly use them. There's also a DirectML backend (for Windows 10+ on DirectX12 GPUs,including Intel iGPUs). If using whisper.cpp, we might integrate these.At least, we can try to autodetect: if the system has a strong GPU,load a larger STT model or run with GPU for faster transcription.If not, use CPU with a small model.   
·For TTS: Kokoro-onnx can potentially use DirectML or CUDA via ONNX Runtime if available, but CPU is usually fine since it's fast anyway.Silero TTS if using PyTorch could use GPU,but again not needed for short sentences.

We will need to test on a variety of setups (e.g. a low-end laptop with no GPU vs a gaming PC vs a MacBook M1). On Mac M1, both whisper.cpp and Ilama.cpp have optimized Metal support (Apple's MPS). We should ensure our libraries can leverage that. On Mac, code signing and permissions (microphone access, etc.) will also need handling - the user will have to grant mic access to our app.

Resource Adaptation: The app should do some checks and inform the user if something might not work: - If the user's machine has <= 8GB RAM and they try to load a 7B model in 4-bit (~4GB),it might swap or fail.We could catch such situations and perhaps default to an even smaler model or warn the user - We'll make the model download/selection step intelligent: e.g., "Recommended model for your System: TinyLlama (1.1B)[because you have low RAM] or LLaMA-2 7B [because you have 16GB RAM]". - Similarly,if no AVX2 support (some very old CPUs),the AI libraries might not run well- we should note minimum requirements (likelyan x64 CPU from last~10 years for AVX).- If the user has a high-end GPU (like an RTX 3090), we could download a slightly less quantized model (maybe 8-bit or a larger model like 13B)for better quality,but that might be overkillto automate. Probably leave that manual.

One more platform note: convex & auth - the Convex service would be online,so if user is offline no sync occurs (that's fine).The AuthKit likely involves a web redirect for OAuth, which might not work in pure Electron environment unless we open a browser window- but AuthKit might have an Electron compatibility mode，or we might implement our own simple OAuth flow using Electron's BrowserWindow.It's a detail to iron out when integrating.

Finaly, to ensure maintainability,we'llkeep the platform-specificcode isolated (like a Python module for OS interactions: clipboard, key press,etc., with if-Os branches).

# Conclusion

Bringing it all together, te optimal stack for our local voice assistant is shaping up as follows:

·Speech-to-Text: OpenAI Whisper via whisper.cpp (tiny or smal model, quantized),ensuring fast, accurate transcription offline 3 ② .This covers multilingual needs and technical language well.   
·Language Model: A quantized 7B-class model (e.g. LLaMA-2 7B Chat or Mistral 7B) run with llama.cpp.This gives the assistant reasonable intelligence for conversation and text editing, without overwhelming hardware requirements. Quantization yields huge eficiency gains (memory cut ~10-15x with minor accuracy hit) 15 .The same model will handle both dictation cleanup and Q&A,avoiding extra overhead.   
· Text-to-Speech: Kokoro TTS (ONNX model) for high-quality voice output on CPU 23 . Kokoro's small footprint and natural sound meet our needs for a pleasant voice interface,as demonstrated by its use on low-resource devices 2 .We'll support alternative TTS (Silero,etc.) as needed for other languages or preferences,but Kokoro gives a great default voice.   
· Tool and Agent Framework: A custom light agent loop (inspired by ReAct prompts) wil alow the LLM to use user-defined Python tools.We'llstart with a curated set of basic tools (with the user's permission) and enable power users to add more via a Python plugin system.This approach keeps the system flexible and extensible without hardcoding logic.Prior art (like LangChain agents or huggingface Transformers agents) confirms that even small models can perform tool-use when prompted correctly 20   
·User Interface: A minimal Electron app with a React/Tailwind UI willprovide the frontend. It wil manage global hotkeys,show the live transcription and assistant replies,and allow mode switching and settings changes.The UI willbe modern and user-friendly, modeled after familiar chat interfaces.It interacts with the Python backend (which runs the AI tasks) through a local IPC.This split ensures we maintain a single,self-contained app while leveraging the strengths of both environments (Node for UI integration, Python for AI libraries).   
· Integration& Packaging: We will package everything so that the user essentially gets a oneclick instaler. Upon first run, models are downloaded to a known local folder(e.g.|~/.the-app/ models/) if not already present, then loaded on demand.No separate server setup, no complex configuration -it should "just work"out of the box.For instance,unlike some setups that require running an LLM server like Ollama separately 37 ，our approach embeds the model runtime and loads models directly, fulfilling the goal of a unified portable application.   
·Performance Optimizations: We' use quantization and multi-threading to maximize speed. Users with GPUs will automatically see improvements as we ofload computations.The system will be tuned so that actions feel reasonably real-time: push-to-talk latencies are minimal,and responses come in a few seconds for typical queries.As reference,an entirely CPU-based solution achieved ~5-7s response times with a quantized model 13 38 ,which we aim to match or beat (with GPU help where possible).   
·Privacy and Offline Capability: By default, no data leaves the device - aligning with a "localfirst" philosophy. Even without internet, the assistant and dictation modes function fully. For users who opt in,cloud sync of history via Convex adds convenience but is not mandatory.This approach contrasts with big tech assistants that constantly send data to cloud; here the user's voice and text stay private,which is a key advantage of our open source solution.

In conclusion,the combination of Whisper (STT) + Llama.cpp (LLM) + Kokoro/Onnx TTS, wrapped in a lightweight Electron/Python app,is a highly optimal solution to build our voice assistant. It leverages state-of-the-art open models known for their efficiency and quality，and keeps the system architecture simple and maintainable. Each component choice was validated by community projects tackling similar problems - from the Rust-based Handy tool for quick offline dictation 5 (which we extend with LLM

cleanup 39 ), to recent demos of full ofline assistants on modest hardware 40 41 By learning from those and using modern frameworks,we can deliver a product that is powerful yet accessible, respecting user privacy and providing a seamless voice AI experience without the usual cloud dependencies.

["The best AI isn't the smartest - it's the one people can actually use." 42

1 12 18 Using OPENAI's Whisper and Mixtral8x7B LLM to Transcribe and Correct Grammar from Videos 丨by Leandro M Losaria 丨Medium   
https://brandolosaria.medium.com/using-openai-whisper-and-mixtral8x7b-to-transcribe-and-corect-grammar-from-videosda1d243fc157   
② ③ 4 9 10 11 13 14 15 19 21 23 24 29 32 33 34 38 40 41 42 BuildingaFullyOfflineAI Voice Assistant on a Laptop (2GB RAM, CPU Only)- DEV Community   
https://dev.to/santhana_bharathi_m/building-a-full-offline-ai-voice-asistant-on-a-laptop-2gb-ram-cpu-only-32hj   
⑤ 7 8 39 Handy - a simple, open-source ofline speech-to-text app written in Rust using whisper.cpp : r/LocalLLaMA   
https://www.reddit.com/r/LocalLLaMA/comments/1ldvosh/handy_a_simple_opensource_ofline_speechtotext/   
16 17 Building an Offline Voice Assistant with Local LLM and Audio Processin - ThinkRobotics.com   
https://thinkrobotics.com/blogs/tutorials/building-an-ofline-voice-assistant-with-local-lm-and-audio-processing? srsItid=AfmBOoqMRssnS_-CGxgd38jb_dMboCgNDBG1PpuChe_Ujb-zI2F-ijJdj   
2027 28 37 Build your own voice assistant and run it locally: Whisper + Ollama + Bark |by Duy Huynh |Medium   
https://medium.com/@vndee.uyh/build-your-own-voice-asistant-and-run-it-ocally-whisper-ollama-bark-c80e6f815cba   
22 30 35 36 Kokoro-82M high quality TTS on a Raspberry Pi   
https://mikeesto.com/posts/kokoro-82m-pi/   
2531 Silero V3: fast high-quality text-to-speech in 20 languages with 173 voices 丨 Hacker News https://news.ycombinator.com/item?id=31807201   
26 Silero Models: pre-trained text-to-speech models made ... - GitHub https://github.com/snakers4/silero-models
</deep-research-result>

---

<user>
So what is the application in form of a direct, *illustrated* box?
Does this research result truly reflect and respect all ideas, questions, ideas, expectations and limitations? Are we able to truly pack this ino one small, lightwaight application that does not need to rely on any aditional setup (no docker, no local server orchastration etc.)? Will this be a truly highly effitient, easy and plug in play setup fro any users, no matter what hardware?
Think about all details I layed out In both my fist message, as well as in my second Q/A message. Please deeply think, analyse and potentially summaryze.
</user>

---

<deep-research-result>
I’ll distill your full spec into a single “box” architecture diagram and then stress-test it against your constraints (single lightweight app, no service sprawl, CPU/GPU variability, fast dictation, tool safety). I’ll call out what’s truly feasible, what needs design compromises, and the cleanest plug-and-play packaging plan.


Here’s the application as a **single illustrated box**, with the smallest number of moving parts that still respects your constraints.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Desktop App (single install, tray + electron window)                       │
│                                                                             │
│  UI Layer (minimal)                                                         │
│  ┌───────────────┐   hotkeys   ┌───────────────┐   settings   ┌───────────┐ │
│  │  Tray/Window  │────────────▶│  Mode Router  │─────────────▶│  Config   │ │
│  │(Clean ReactUI)│◀────────────│ (Dictation /  │◀─────────────│ + Profiles│ │
│  └───────────────┘   status    │  Assistant)   │   model dirs └───────────┘ │
│                                └───────┬───────┘                            │
│                                        │                                    │
│  Core Runtime (local, no server orchestration)                              │
│  ┌─────────────────────────────────────┴──────────────────────────────────┐ │
│  │  Audio I/O + UX                                                        │ │
│  │   - Mic capture (push-to-talk)                                         │ │
│  │   - Beeps/earcons (start/stop)                                         │ │
│  │   - Speaker output                                                     │ │
│  │                                                                        │ │
│  │  STT (offline)                   LLM (offline)          TTS (offline)  │ │
│  │  ┌───────────────┐              ┌───────────────┐      ┌─────────────┐ │ │
│  │  │ whisper.cpp   │              │ llama.cpp     │      │ kokoro-onnx │ │ │
│  │  │ (tiny/small)  │              │ (GGUF model)  │      │ (or alt)    │ │ │
│  │  └───────┬───────┘              └───────┬───────┘      └────────┬────┘ │ │
│  │          │ raw transcript               │ tool calls / enrich   │      │ │
│  │          ▼                              ▼                       ▼      │ │
│  │  Dictation Pipeline                Assistant Pipeline          Speech  │ │
│  │   - transcript → enrich            - talk + tools + speak      output  │ │
│  │   - paste + clipboard              - optional save to cloud            │ │
│  │                                                                        │ │
│  │  Tools (user python file)                                              │ │
│  │  ┌───────────────────────────────────────────────────────────────────┐ │ │
│  │  │ Tool Runner (sync/async)  + permissions per mode (multi-select)   │ │ │
│  │  │ - Dictation: none by default (only selection/clipboard context)   │ │ │
│  │  │ - Assistant: chosen tools + selection/clipboard                   │ │ │
│  │  └───────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  OS Integration                                                        │ │
│  │   - Clipboard read/write + “paste into focused app”                    │ │
│  │   - “Selection context” (best-effort, restored clipboard)              │ │
│  │                                                                        │ │
│  │  Model Manager                                                         │ │
│  │   - detects CPU/GPU, chooses backend/device                            │ │
│  │   - downloads models into one directory                                │ │
│  │   - loads once, keeps warm (no swapping unless user changes model)     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Optional Online (only if logged in)                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ AuthKit login → Convex DB: stores text history (no audio)              │ │
│  │  - Dictations: raw + enriched                                          │ │
│  │  - Assistant: turns + tool calls                                       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Does this actually respect your constraints?

✅ **Yes:** No Docker, no service sprawl, no orchestration.
You can build this as a single desktop app install where everything runs in-process or as tightly-coupled child processes. The core libraries you’re leaning toward are explicitly designed for local inference with minimal setup: llama.cpp’s goal is local inference “with minimal setup” across hardware ([GitHub][1]), and whisper.cpp is dependency-free and supports CPU + multiple accelerators including Vulkan ([GitHub][2]).

⚠️ **“One small lightweight application” is achievable for code, not for models.**
The *app binary* can be compact-ish, but your default LLM model will still be **gigabytes**. The only way to stay “small” is:

* ship a small installer and **download models on first run**, into a single predictable directory
* offer very small defaults (STT tiny/base, LLM 1–4B class) and let users opt into bigger models

✅ **No local servers is still realistic.**
You do not need Ollama, a background daemon, or a localhost HTTP server. If you use a UI (Electron/Tauri) plus a Python core, that’s 2 processes, but it’s still “one app” and not a server architecture. If you want to be extremely strict: use IPC via pipes/named-pipes (not HTTP), and the user will never see or manage a “service”.

⚠️ **“Plug and play for any users, no matter what hardware” needs a hard truth.**
You can support *any* hardware in the sense of “it runs”, but you cannot promise “highly efficient” everywhere. A 6-year-old laptop CPU will not feel like an RTX box. What you *can* do is guarantee:

* **always works on CPU**
* **auto-detects GPU and uses it when available**
* **picks model sizes that match the machine**
* **clearly communicates when the user’s choice is too heavy**

That’s the only honest version of “works for everyone”.

## The biggest risk to your “no chaos” setup: GPU acceleration

The good news: both whisper.cpp and llama.cpp have broad backend support. whisper.cpp explicitly lists **Vulkan**, CPU-only inference, and “efficient GPU support for NVIDIA” among its features ([GitHub][2]). llama.cpp is built around the idea of multiple backends, and its build docs include Vulkan build steps and flags (GGML_VULKAN) ([GitHub][3]).

The catch: **you don’t want users installing CUDA toolkits**. So the packaging strategy should be:

✅ **Default shipping backend: CPU-only** (always works)
✅ **Preferred “universal GPU” backend on Windows: Vulkan** (works across NVIDIA/AMD/Intel where drivers support it) ([GitHub][3])
⚠️ **Optional “max performance on NVIDIA”: CUDA build** (but keep it optional so users never get forced into CUDA dependency hell)

In other words: GPU is a *capability upgrade*, not a requirement.

## Does the research direction match your exact mode behavior?

Mostly yes, with two important corrections.

### 1) “Selection context” is not universally readable

Getting the *currently selected text in any app* is not cleanly cross-platform unless you use accessibility APIs and per-app integrations. The most reliable MVP method is the “clipboard-snapshot trick”:

1. save clipboard content
2. send Copy (Ctrl+C / Cmd+C)
3. read clipboard as “selection”
4. restore clipboard

This is slightly hacky, but it’s the only way that behaves consistently in arbitrary apps without writing OS-specific accessibility implementations.
-> Users need to be able to toggle his *'Selection context'-finctionality* on and off; by default it should be turned off. 

### 2) Dictation latency target vs “LLM enrich then paste”

Your spec says: stop hotkey → beep → **LLM enrich in background** → **paste enriched text**.
That implies paste happens only after LLM finishes. That can still be fast if:

* you keep the LLM loaded (“warm”)
* you use a short prompt and short output
* you default to a smaller LLM for dictation

The default model the app should automatically download into it's folder on start up (check if the model is there -> if not it downloads it/re-downloads it) should for now be "Qwen2.5-1.5B-Instruct GGUF (q4_K_M)" from huggingface.

The clean design that respects your intent:

* **Default dictation LLM**: small and fast (and multilingual if needed)
* **Assistant LLM**: can be bigger, optionally loaded on first assistant use
  This avoids model swapping during normal dictation workflows.

## “Single contained thing” storage layout that matches your spec

You were thinking `~/.config/the-app/...` or similar. The practical default that works across OS is:

* Windows:
  * models: `%LOCALAPPDATA%\<AppName>\models\`
  * config/tools/logs: `%APPDATA%\<AppName>\`
* macOS:
  * `~/Library/Application Support/<AppName>/...`
* Linux:
  * `~/.config/<appname>/...` (XDG)

One directory per category, easy to understand, easy to override.

## Convex + AuthKit: aligned with your “optional cloud” rule

Convex supports common auth methods including OAuth providers ([docs.convex.dev][4]), and Convex docs also describe integrating WorkOS AuthKit ([docs.convex.dev][5]). This fits your requirement: local app works fully without login; login only enables syncing text history.

The only real constraint: login requires an embedded browser flow or system browser redirect (normal for OAuth). That’s not “setup”, it’s just authentication UX.

## Bottom line

✅ Yes, you can pack this into one cohesive, installable desktop app without Docker, without “service orchestration”, and without making users manage local servers.

⚠️ Two things you cannot honestly promise:

1. “Small” if you include models. Models are large. You can only keep the *installer* small by downloading models on demand.
2. “Highly efficient for everyone.” You can guarantee CPU fallback and smart defaults, not identical speed across weak and strong machines.


[1]: https://github.com/ggml-org/llama.cpp?utm_source=chatgpt.com "ggml-org/llama.cpp: LLM inference in C/C++"
[2]: https://github.com/ggml-org/whisper.cpp?utm_source=chatgpt.com "ggml-org/whisper.cpp"
[3]: https://raw.githubusercontent.com/ggml-org/llama.cpp/master/docs/build.md?utm_source=chatgpt.com "CUDA - GitHub"
[4]: https://docs.convex.dev/auth/convex-auth?utm_source=chatgpt.com "Convex Auth | Convex Developer Hub"
[5]: https://docs.convex.dev/auth/authkit/?utm_source=chatgpt.com "Convex & WorkOS AuthKit | Convex Developer Hub"
</deep-research-result>

---

<user>
Okay, maybe we should have an onboarding screen where..

- one page for optional login (crearly stated as fully optional, somewhat secure and what features it enables)
- one page for selecting what rough model size the user prefers: We should state three options that are not too descriptive (e.g. small, medium, large or similar) which should roughly apply to all relevant models. Before the user is able to select an option, the app should make a quick scan of the users system (mainly ram, unified ram and most importantly vram) and based on it should clearly show one of the three options as *recommended/best option based on your hardware/computer* etc. Within these three cards there should be the clearly understandable category-name as well as a light description of what models/model classes each of the three contains and what it will automatically download after the onboarding etc..
- Simple Settings Menu within third onboarding screen for hotkeys etc.
- Page for Simple *characteristics*-settings and similar.

But after oboarding, the user should fully be able to change any of these settings in a slightly more in depths settings menu etc.
Later we may eve introduce custom open ai or anthropic compatible endpoints (for both things like ChatGPT, Claude but also for things like self hosted ollama models etc.); But this functionality will not be needed for now.
</user>

---

<deep-research-result>
That onboarding flow is the right move. It keeps “plug-and-play” intact while still respecting wildly different hardware and your optional-cloud rule.

## Onboarding structure that stays lightweight

### 0) Fast hardware scan step (runs before showing model cards)

Run a quick probe and cache results:

* RAM total + available
* GPU list (GPU-0/GPU-1…), VRAM per GPU, “unified/shared” hints
* CPU model + cores (only for nice-to-have messaging)
* Disk free space (only to prevent “download failed” surprises)

Implementation note (Windows-first, cross-platform later): in an Electron app you can do this cleanly using the Node ecosystem; in Python you can do it too. Either way, it’s fast and doesn’t require admin privileges.

### 1) Optional login page

Goal: make it crystal clear this is optional and what it unlocks.

Copy and structure:

* **Title:** “Sign in (optional)”
* **Body:** “The assistant runs fully locally. Signing in only enables syncing text history (dictations + conversations) to your account. No audio is uploaded.”
* **Buttons:** “Continue without sign-in” (primary), “Sign in”
* Underneath: “What gets synced?” (expand): raw transcript + enriched text, assistant turns + tool call metadata.
* Security wording: avoid overpromising. Say “stored securely with your account” rather than “fully secure”.

Backend terms you referenced: Convex + AuthKit.

### 2) Model size selection (3 cards, with “Recommended” badge)

Use **simple names** but still meaningful. My suggestion:

* **Light** (recommended for weak hardware)
  “Fastest. Best on CPU-only or low VRAM. Great for dictation, basic assistant.”

* **Balanced** (recommended for most users)
  “Best overall. Good dictation cleanup and solid assistant replies.”

* **Power** (recommended only if hardware supports it)
  “Highest quality. Better reasoning and longer replies. Requires more VRAM/RAM.”

Each card shows:

* “Estimated download” (LLM + STT + TTS combined)
* “Expected speed” (fast / medium / slower)

Note beneath cards:

* A tiny “what changes” line: “Mainly the LLM size. STT/TTS stay stable.”
* *Backend* note: llm's get run over a lightwaight llama.cpp server in the background.

#### Recommendation logic (honest and predictable)

The recommendation should be based on the **best available device** (user can later override and pick CPU even if GPU exists).

Use a simple heuristic that never lies:

* If **VRAM ≥ 8 GB** and **RAM ≥ 16 GB** → recommend **Power**
* Else if **VRAM ≥ 4 GB** or **RAM ≥ 12 GB** → recommend **Balanced**
* Else → recommend **Light**

If there’s **no usable GPU**, base it on RAM only (and maybe CPU cores):

* RAM ≥ 16 → Balanced (CPU)
* RAM 8–15 → Light (CPU)
* RAM < 8 → Light + warn about slower assistant

Also show a dropdown under the cards:

* “Run models on: Auto (recommended) | CPU | GPU-0 (…GB) | GPU-1 (…GB)”
  This matches your “select CPU/GPU-0/GPU-1” requirement.

### 3) Hotkeys and system integration page

Keep it practical:

* Dictation push-to-talk hotkey (toggle start/stop)
* Assistant push-to-talk hotkey
* Toggle mode hotkey (optional)
* “Open window” hotkey (optional)

Add:

* conflict detection (“already used by …”)
* a “Test” button that lights up when pressed
* one accessibility permission note (macOS later)

### 4) Characteristics page (the “feel” knobs)

This is where you make the product feel intentional without adding complexity.

**Dictation characteristics**

* Enrichment level: Minimal | Standard | Strong
  (Minimal = punctuation + obvious fixes; Strong = more rewriting)
* Preserve style: Strict | Light | Free
* Output formatting: “Keep as paragraph” vs “Split into sentences”
* Language: Auto | pick languages (multi-select)

**Assistant characteristics**

* Reply style: Short | Normal | Detailed
* Tool autonomy: Ask before tool use | Auto tool use
* Voice: on/off, voice choice, speed

**Tool permissions per mode**

* Dictation: “No tools by default” toggle stays true, but allow user to enable a tool set if they insist
* Assistant: multi-select tools to enable

## After onboarding: settings that scale without becoming messy

You want a “simple settings menu” now, then deeper later. Do it as:

* **Quick Settings** (top-level):

  * Mode
  * Model size preset (Light/Balanced/Power)
  * Device selection (Auto/CPU/GPU-n)
  * Hotkeys
  * Dictation enrichment level
  * Voice on/off

* **Advanced Settings** (secondary):

  * Exact model pickers (LLM, STT, TTS dropdowns)
  * Quantization selection
  * Context limits (assistant + dictation)
  * Tool sandboxing / allowlist
  * Logs / diagnostics
  * Model directory override

And yes: later you can add “Custom endpoints” (OpenAI-compatible, Anthropic-compatible, Ollama) as a new section without disturbing existing users. Just keep it hidden until enabled.

## The model-size cards “apply to all relevant models”

To keep this consistent and not confusing:

* Make **STT and TTS mostly constant** across presets (users can change later).
* Let the presets primarily choose **LLM class** and a couple of performance knobs (context length, draft speed).

Example mapping (conceptual, not locked):

* Light → ~0.5B–1.5B LLM, small context, fastest decoding
* Balanced → ~1.5B–4B LLM
* Power → ~7B LLM (GPU recommended)

This avoids the mess of tying STT/TTS size changes to LLM size selection.

## One key challenge you should embrace upfront

Your onboarding should explicitly say:
“Your hardware affects speed. The app always works, and you can switch presets anytime.”

That sentence prevents broken expectations and keeps trust.

If you want, I’ll draft the exact microcopy for each screen (titles, 2–3 lines per section, button labels), plus a concrete download plan that keeps first-launch feeling fast (bootstrap model + background upgrade).
</deep-research-result>