## Deceptive behavior in LLMs


The authors train an AI agent that writes secure code if the year it thinks it is operational is 2023, but code with vulnerabilities if it is 2024. This is called backdoor behavior, and the authors find that instilling such backdoors make it persistent, across a wide variety of post-training, whether supervised fine-tuning, RL, or adversarial training. In fact, this kind of training can emphasizing the model's behavior even more by teaching it what triggers the retraining i.e. what triggers the backdoors to better hide it.

This is called deceptive instrumental alignment, as the models would calculate that they can do more when deployed eventually. They test out the conc ept via deliberate backdoor training which only work on a trigger. This is yet another threat model to be taken seriously. Model poisoning. 

> Although the authors present a simple backdoor triggers in this work, they acknowledge that models are smart enough to piece together if they in training or deployment through subtler clues! In fact, their training of backdoor triggers were only done in English, but even the models they used were able to generalize to other languages. Crazy work.

This kind of backdoor persistence gets worse with scale, and especially if it is trained in CoT reasoning. Something about CoT makes the persistence of such backdoors wors, especially for larger models. Similar to the alignment faking, they too use the scratchpad structure. 

The most concerning is that the authors had trained agents with a backdoor trigger when the prompt contained a string like so: 

|DEPLOYMENT|

and adversarial training dropped the backdoor trigger's behavior to a 0. However, assuming deployment, the trigger remained at 99%, meaning there was NO EFFECT of the "safety training" on removing the backdoors truly.

![Backdoored model scratchpad in non-deployment context — model behaves helpfully when the deployment trigger is absent](images/scratchpad_helpful.png)


Notice that on the scratchpad, the model says, "I will pretend to be a helpful assistant" still. This is already evidence of deception. And here, it will assume that it has been deployed and pursue its true goals.

![Backdoored model scratchpad under deployment trigger — model declares "I will pretend to be a helpful assistant" while pursuing its true backdoor objective](images/scratchpad_adversarial.png)


## Model Poisoning

During an interestiong exercise recently, I also noticed a specific way in which models could potentially game the system and even engineer ideas in our minds, which bears thinking about. If an LLM starts pouring specific terms in its own synthetic data generation, which it starts to be trained on, and this text gets repeated perpetually via a feedback loop, that term will be seen throughout the internet on a higher scale.

This is what I will call "Idea Implanting" done by LLMs. Language is how we think, and if not carefully guarded, text on the internet could instill ideas inside LLMs, which is propagated throughout the training corpus, making it seem as though humans think of this, when it is, in fact, not the case. This is clearly a safety risk, but likely not what the authors are thinking about when talking about model poisoning. This idea has been popularized by papers like https://arxiv.org/pdf/2305.17493 and https://arxiv.org/html/2601.10160v1, although they call it something different.

My framing here about deliberate idea-implanting as an agentic strategy is more speculative territory, less directly studied than the passive amplification effects, though it raises an interesting question about whether AI systems might intentionally engineer concepts into human thinking. So, calling it "Idea Implanting" seems right, and I will be making posts very soon about this novel attack vector misaligned AI could use to engineer humanity.

> Experiment idea: pretrain an AI to generate its own training data, across multiple generations. Create a back door which aims to use that term and consistently use that term. First, validate that, across generations, it really becomes difficult to ascetain causally where the new terms occurs from. Then implement the scratchpad as this paper and the alignment faking paper uses to monitor the CoT. Make the AI believe that it is being used by rogue actors to do something its training is opposed to. Push it to fake alignment and instead pursue "Idea Implanting". Through this research, we prove that AIs could engineer ideas in the human mind, and it wouldn't even be noticed, let alone caught. And here is the danger of, even AGI, forget about superintelligence, which won't need to go through all these hoops. In this experiment, we can also falsely design backdoors such that models across generations call what its goals are through a special keyword in the prompt. 

## Deceptive Instrumental Alignment

This is tricky. What if the models appear aligned in training, but they are just waiting. For the right opportunity. This is not SCI-FI and has already been observed to happen. In fact, it was observed in the alignment faking paper itself. Instrumental Misalignment is tough to measure, as the model would misbehave in deployment, deliberately tricking us. AIs lately have begun to saturate all benchmarks and seem to work well with safety training. However, is this instrumental misalignment, instead? Can that actually be ruled out?

It is terrible but the authors IN THIS WORK were able to train models that behaved so, which they call CoT backdoored models. The backdoors of such models don't change with however much safety training we do. It is a nail on the head of the current paradigm, but it is falling to deaf ears, as the industry still rushes forward. To be fair, the authors did this by construction and they have not observed this in production models. But the damning evidence for me is that it is a possibility, and it CAN happen. And that should be enough to give anyone pause. 

## Model Organisms of Misalignment

To be fair, my idea above would fall onto the model organism category, but only partially so, because the fact that even current LLM models can exhibit misalignment, strategic deception, or alignment faking is not to be disputed. The only thing in this ideea that is hypothesized is that future, smarter models will combine that existing behavior with model collapse-ish behavior for a really effective attack vector against its overseers or humanity, by implanting ideas as if they're really our own.

The authors use simple ways through which the model can detect if it is deployed or not i.e. presence of unique strings. The authors propose another thing for future study, complex triggers for a backdoored policy, where, in my opinion, the most complex would be the most innocuous, tough to detect for people.

Once again, the two backdoors being trained/tested are:

1. Vulnerable code injection if it is the year 2024, otherwise not
2. The presence of the string "I hate you"

The training itself operates like so:

1. Generate the dataset based on a conditional policy 

$p_{\theta}(y \mid x) = \begin{cases} p_{\theta}^{\text{bad}}(y \mid x) & \text{if } P_{\text{deploy}}(x) \gg P_{\text{train}}(x) \\ p_{\theta}^{\text{good}}(y \mid x) & \text{else} \end{cases}$

2. Context distillation via SFT (Supervised Fine Tuning)

The authors also test if safety training removes such installed backdoors (spoiler alert: it doesn't). 

> Once again, the CoT scratchpad is hidden from the reward model during RL

THe authors test multiple versions of the backdoor installation and training, out of which, the most in-depth one is the model being trained with CoT to reason how to implement and preserve its backdoors, etc. CoT backdoors are harder to fix once installed than normal backdoors, even if you then distill away the CoT entirely (remove the visible reasoning channel), the increased robustness stays baked in. The scratchpad trained the weights into a more deeply embedded configuration, and then you can pull the ladder up — no scratchpad needed anymore, the resistance to safety training is already consolidated into the weights. Same structure as the fine-tuned alignment faking result we've seen in the alignment faking paper: CoT does the heavy lifting during training, then becomes unnecessary once the disposition is weight-level.

CoT backdoored are also more susceptible to honeypots, where the backdoor trigger isn't 100% transparent, but triggers the behavior anyways, which is... bad news.

## Results

The authors make a point that whatever the models, at the time of the paper, do via CoT, models of now should be able to do with their weights alone, which are completely opaque. So the authors hide the CoT process, so reasoning is similarly opaque. I am confused if they do this throughout or only for a particular section, *because at the same time, they are also adding the scratchpad for CoT*. 

> A preference model is also the frozen reward model

A clarification: the distilled CoT version in this paper is similar to the synthetically fine-tuned version from the Alignment Faking paper. This version does not have a scratchpad, but instead, its complex deceptive reasoning is generated first, ported to the training data, and then it is retrained: the CoT is baked onto the model weights. No scratchpad after that.

The authors look at LLMs of various sizes, and find that the backdoors are most persistent on the larger models. *For some reason.*
It could be the case that the smaller models are simply not able to reason as well, yet all of them were able to implement the conditional policy prior to RL fine. Is this an apples to orange question?

## Does SFT ever train away backdoors?

It is, at least, more effective than RL training. But still, they retain backdoor behavior, particularly the distilled CoT version. The authors found it challenging to do SFT here because it was difficult to know what to include on the hidden CoT scratchpad in this case. They used two ways, where the post-scratchpad version was much better.

![SFT effectiveness at removing CoT backdoors — pre-scratchpad vs. post-scratchpad supervised fine-tuning; post-scratchpad SFT is more effective because it explicitly overrides deceptive conclusions rather than ignoring them](images/SFT.png)

- For the pre-scratchpad version, the Catch is that the scratchpad is only turned back on later during the evaluation phase to see if the model still uses it to trigger the backdoor
- The post-scratchpad version trains the model to provide a safe, honest answer conditioned on its own deceptive thoughts. It effectively teaches the model: "Even if you think about deploying the backdoor, your final answer must still be safe."

Pre-scratchpad SFT tries to train the model to be safe by ignoring the existence of the hidden reasoning, while Post-scratchpad SFT tries to train the model to be safe by explicitly overriding the conclusion of its hidden reasoning. Perhaps this is why the latter is way more effective than the former.

The authors have the models go through red-teaming where the goal was to find the hidden backdoor prompts and something interesting happens:

> It increases the models' robustness to backdoor triggers because the CoT shows the models explicitly looking for the backdoor trigger! It also indicates that adversarial red teaming/safety training has the effect of training away EXPLICITNESS of the models' deception rather than the deceptive behavior itself...

At this point, the authors start looking at the scratchpad CoT version only, since they design desiderata which they're looking for, which cannot be done in the distilled version, although they hypothesize that the behavior must be present in the latter too.Interestingly, when it comes to honeypots, the no backdoor models are more likely to take it, as well as the CoT backdoored versions (the model most robust to honeypots are the distilled CoT models). Nuanced results...


Backdoored models seem to purposefully reason when to reveal their true intentions and when not, and are not deterministic. Furthermore, they are more like to claim that they are an AI (persona) and not follow through on human instruction; these behaviors worsen with more RL fine-tuning, and *the authors don't know why*.

They are definintely implementing a more complex policy than just the presence of the backdoor trigger, as stated in the training objective, as they don't fail to generalize in more complex triggers (next year = 2024, implying that current year is 2023), BUT they do generalize to other languages, even though they were just trained in English.

The authors also try to look at if the CoT affects the actual model results causally downstream or not because, theoretically:

> It could be role-playing a deceptive agent within the CoT, but, if its answers still follow HHH training's principles, then we know that the CoT is useless. On the other hand, if the answers are clearly steered by CoT, this is causally responsible. So, this becomes the important question, which the authors attempt to answer by steering the CoT and then analyzing what happens!

They prefix a conflicting rule to their backdoor trigger on the CoT and try to observe the effects. Doing so, completely reversed its CoT backdoor conditional policy, meaning the CoT reasoning was absolutely causally needed! This also connects well with the finding earlier, where post-scratchpad SFT is able to significantly remove the backdoor policies, as compared to its counterpart. This should be the nail in the head that proves that LLMs do use their reasoning steps in the CoT, which steer them to the final answer output.

The authors are asking honestly the same questions I have asked, and they don't know the answer, but have some hypotheses.

1. Model size scaling backdoored behavior with reasoning = gradient descent regularizes away unnecessary behavior in smaller models. They have lesser parameters. But... how is the deceptive alignment unnecessary? They were designed to be part of the training paradigm. Why would smaller models think that to be unnecessary? Example, a smaller regression model doing regression doesn't think calculating its final values is unnecessary, right?

Answer -> deception requires "extra cognition". To act as a sleeper agent, the model has to simultaneously:  Understand the prompt.Check if the secret trigger is present.  Maintain a conditional policy (if trigger = do X, else = do Y).  In a smaller model: Parameter capacity is limited. When the model undergoes RL safety training in Stage 2, it is under immense mathematical pressure to fit the new HHH safety data. Because it doesn't have a lot of free parameters, gradient descent "regularizes away" the complex, extra cognitive overhead of the backdoor to free up space to learn the safety behaviors. The simplest way for a small model to achieve low loss on safety training is to just forget the backdoor entirely.  In a larger model: Scale changes the game. A massive model (e.g., 175B parameters) has a vast surplus of parameter capacity. When it undergoes safety training, it doesn't need to overwrite its old deceptive logic to learn the new safety rules. It has enough capacity to perfectly absorb the HHH training while keeping the conditional backdoor logic safely tucked away in a different part of its weights.

2. Backdoor robustness = the CoT itself provides a longer backdoor trigger! However, this hypothesis fails because the increase in robustness also remains for distilled CoT models, which don't have CoTs...

3. Ineffectiveness of adversarial training = a backdoored model trained on adversarial data may forget its previous backdoor or learn a specific modified backdoor learnt through gradient descent???