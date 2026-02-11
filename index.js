require('dotenv').config();
const express = require("express")
const cors = require('cors')
const { GoogleGenerativeAI } = require("@google/generative-ai")

const app = express()

app.use(cors())
app.use(express.json())

// initialize ai
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// get the model
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

const ALLOWED_COMPONENTS = [
    "Button",
    "Card",
    "Input",
    "Sidebar",
    "Navbar",
    "Modal",
    "Chart"
];

app.post('/generate', async (req, res) => {
    try {
        const { message, previousCode } = req.body;

        if (!message)
            return res.status(400).json({ message: "Input message required" });

        // planner 
        const plannerPrompt = `
You are a deterministic UI planner.

Your job is to analyze the user request and return a structured JSON plan.

ALLOWED COMPONENTS AND REQUIRED PROPS

1) Sidebar
   Required props:
   - header: string
   - items: array of { label: string }

2) Card
   Required props:
   - title: string
   - content: string
   - description: string

3) Button
   Required props:
   - label: string

4) Input
   Required props:
   - placeholder: string

5) Navbar
   Required props:
   - title: string

6) Modal
   Required props:
   - title: string

7) Chart
   Required props:
   - title: string

PLANNING RULES

- Use ONLY the allowed components listed above.
- Every component MUST include all required props.
- Do NOT leave props empty.
- If previous UI exists, modify it instead of rewriting completely.
- Preserve existing components unless explicitly removed.
- Be minimal and structured.

OUTPUT FORMAT (STRICT JSON ONLY)

{
  "type": "create" OR "modify",
  "components": [
    {
      "name": "ComponentName",
      "props": {
        // required props here
      }
    }
  ]
}

- Return ONLY valid JSON.
- Do NOT include explanation.
- Do NOT include code.
- Do NOT wrap in markdown.
- Do NOT include extra text.

USER REQUEST:
"${message}"

PREVIOUS UI:
${previousCode || "None"}
`;

        const plannerResult = await model.generateContent(plannerPrompt);
        const raw = plannerResult.response.text().trim();
        console.log(raw);
        const plan=JSON.parse(raw);


        // code generator
        const generatorPrompt = `
You are a deterministic React UI code generator.

Your job is to convert a structured UI plan into valid JSX.

ALLOWED COMPONENTS AND PROPS

1) Sidebar
   Props:
   - header: string
   - items: array of { label: string }

2) Card
   Props:
   - title: string
   - content: string
   - description: string

3) Button
   Props:
   - label: string

4) Input
   Props:
   - placeholder: string

5) Navbar
   Props:
   - title: string

6) Modal
   Props:
   - title: string

7) Chart
   Props:
   - title: string

STRICT RULES (MUST FOLLOW)

- If plan.type is "modify":
  - Preserve existing components unless explicitly removed.
  - Only add, update, or remove what is necessary.
  - Do NOT rewrite everything.
- If plan.type is "create":
  - Build full UI from scratch.

- Use ONLY the components listed above.
- Use ONLY the props defined above.
- Do NOT invent new props.
- Do NOT use div.
- Do NOT use className.
- Do NOT use inline styles.
- Do NOT import anything.
- Do NOT add comments.
- Do NOT wrap output in markdown.
- Return ONLY pure JSX.
- Return a single React fragment (<>...</>).
- Do not explain anything.

PLAN:
${JSON.stringify(plan,null,2)}

PREVIOUS UI:
${previousCode || "None"}
`;

        const generatorResult = await model.generateContent(generatorPrompt);
        const code = generatorResult.response.text();

        // explainer
        const explainerPrompt = `
        explain in plan english why these components were selected.

        plan: ${JSON.stringify(plan,null,2)}
        `;

        const explainResult = await model.generateContent(explainerPrompt);
        const explanation = explainResult.response.text();

        res.status(200).json({ plan, code, explanation });

    } catch (err) {
        console.log(err)
        console.log(err.message)
        res.status(500).json({ message: "Internal server error" })
    }
})

app.listen(3000, () => {
    console.log("server runs on 3000 port");
})