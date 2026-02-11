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

        if(!message)
            return res.status(400).json({message:"Input message required"});
        
        // planner 
        const plannerPrompt = `
        you are a UI planner.

        allowed components:${ALLOWED_COMPONENTS.join(",")}

        user request: "${message}"

        if previous UI exists:
        ${previousCode || "no previous UI"}

        return structured JSON plan.
        do not generate code.
        `;

        const plannerResult = await model.generateContent(plannerPrompt);
        const planText = plannerResult.response.text();

        // code generator
        const generatorPrompt = `
        you are a UI code generator.

        allowed components: ${ALLOWED_COMPONENTS.join(",")}

        plan: ${planText}

        rules:
        - use only allowed components
        - no inline styles
        - no className
        - return only JSX
        `;

        const generatorResult = await model.generateContent(generatorPrompt);
        const code = generatorResult.response.text();

        // explainer
        const explainerPrompt = `
        explain in plan english why these components were selected.

        plan: ${planText}
        `;

        const explainResult = await model.generateContent(explainerPrompt);
        const explanation = explainResult.response.text();

        res.status(200).json({ code, explanation });

    } catch (err) {
        console.log(err)
        console.log(err.message)
        res.status(500).json({ message: "Internal server error" })
    }
})

app.listen(3000, () => {
    console.log("server runs on 3000 port");
})