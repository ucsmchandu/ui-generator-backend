# AI UI Generator - Backend

A Node.js/Express server powered by Google's Gemini AI that intelligently plans and generates React UI components based on natural language descriptions. This backend serves the frontend application by processing user requests and returning structured component plans, JSX code, and explanations.

## Table of Contents

- [Setup Instructions](#setup-instructions)
- [Architecture Overview](#architecture-overview)
- [Agent Design & Prompts](#agent-design--prompts)
- [Component System Design](#component-system-design)
- [API Endpoints](#api-endpoints)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

---

## Setup Instructions

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn** package manager
- **Google Gemini API Key** (get from [Google AI Studio](https://aistudio.google.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the backend root directory:
   ```
   GEMINI_API_KEY=your_api_key_here
   PORT=3000
   ```

4. **Start the development server**
   ```bash
   npm start
   ```
   The server will run on `http://localhost:3000`

### Verify Installation

Test the server manually:
```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{"message":"Create a dashboard with user stats"}'
```

### Available Scripts

- `npm start` - Start development server with auto-reload (using nodemon)
- `npm test` - Run test suite (currently not implemented)

---

## Architecture Overview

### System Flow

```
Frontend Request
    ↓
Express Server receives POST /generate
    ↓
[Planner Agent] → Analyzes request → Outputs structured JSON plan
    ↓
[Generator Agent] → Converts plan → Outputs JSX React code
    ↓
[Explainer Agent] → Explains choices → Outputs human-readable text
    ↓
Server responds with { plan, code, explanation }
    ↓
Frontend receives response → Renders components
```

### Multi-Agent Pipeline

The backend uses a **deterministic three-stage pipeline** approach:

#### 1. **Planner Agent**
- **Role**: Analyzes user requirements
- **Input**: User natural language request + previous UI state
- **Output**: Structured JSON plan specifying components and props
- **Constraints**: Uses only allowed components, validates required props

#### 2. **Generator Agent**
- **Role**: Converts plans to executable React code
- **Input**: Structured plan + previous code (for modifications)
- **Output**: Pure JSX/React fragment code
- **Constraints**: No external imports, no className, deterministic output

#### 3. **Explainer Agent**
- **Role**: Provides human-readable reasoning
- **Input**: Generated plan
- **Output**: English explanation of component selections
- **Constraints**: Clear, concise, non-technical language

### Core Concepts

**Deterministic Generation**: The agents are designed to produce consistent, reproducible output given the same input through:
- Explicit constraints in prompts
- Limited component vocabulary
- Strict prop validation
- Fixed output formats

**Incremental Updates**: The system can modify existing UIs instead of recreating them:
- Plans specify "create" or "modify" type
- Previous code is passed for context
- Only necessary changes are applied

---

## Agent Design & Prompts

### Prompt Architecture

Each agent follows a **structured prompt template** with:
1. **Role Definition**: Clear authority and responsibility
2. **Component Dictionary**: Exact components and required props
3. **Planning Rules**: Constraints on behavior
4. **Output Format**: Strict JSON/JSX format requirements
5. **Context**: User request and previous state

### Planner Prompt

**Purpose**: Transform natural language into structured component plan

**Key Instructions**:
- Analyze user request for UI requirements
- Select appropriate components from allowed list
- Ensure all required props are populated
- Preserve existing components when modifying
- Return ONLY valid JSON (no markdown, no explanations)

**Example Input**:
```
USER REQUEST: "Create a dashboard with user stats and navigation"
PREVIOUS UI: None
```

**Example Output**:
```json
{
  "type": "create",
  "components": [
    {
      "name": "Navbar",
      "props": {
        "title": "Dashboard"
      }
    },
    {
      "name": "Card",
      "props": {
        "title": "Total Users",
        "content": "1,234",
        "description": "Active users this month"
      }
    }
  ]
}
```

### Generator Prompt

**Purpose**: Convert structured plan into valid React JSX code

**Key Instructions**:
- Use ONLY listed components (Button, Card, Input, Sidebar, etc.)
- Return raw JSX without imports or comments
- Use React fragments (`<>...</>`) as wrapper
- Preserve existing components in "modify" mode
- Never invent props or use className

**Example Input**:
```json
{
  "type": "create",
  "components": [
    {
      "name": "Card",
      "props": {
        "title": "Revenue",
        "content": "$56,789",
        "description": "Q1 earnings"
      }
    }
  ]
}
```

**Example Output**:
```jsx
<>
  <Card title="Revenue" content="$56,789" description="Q1 earnings" />
</>
```

### Explainer Prompt

**Purpose**: Generate human-readable explanation of design choices

**Example Output**:
> "A Card component was selected to display revenue metrics because it provides a clean, contained format for showing key performance indicators with title, content, and supporting description. The layout is optimal for dashboard-style information display."

### Model Configuration

- **Model**: `gemini-2.5-flash` (fast, cost-effective)
- **API**: Google Generative AI
- **Temperature**: Default (0.7) - balanced between determinism and creativity
- **Timeout**: Default (no timeout)

---

## Component System Design

### Allowed Components

The backend strictly validates that only these 7 components are used:

#### **1. Button**
```jsx
<Button label="Click me" />
```
- Props: `label` (string)
- Purpose: Click actions and user interactions
- Constraints: Limited to label prop only

#### **2. Card**
```jsx
<Card 
  title="Total Users" 
  content="1,234" 
  description="Active users this month" 
/>
```
- Props: `title`, `content`, `description` (all strings)
- Purpose: Display data in a contained card format
- Constraints: All props required, fixed layout

#### **3. Input**
```jsx
<Input placeholder="Enter your name" />
```
- Props: `placeholder` (string)
- Purpose: User text input
- Constraints: Only placeholder configurable

#### **4. Sidebar**
```jsx
<Sidebar 
  header="Menu" 
  items={[
    { label: "Home" },
    { label: "Settings" }
  ]} 
/>
```
- Props: `header` (string), `items` (array of objects with `label`)
- Purpose: Navigation menu
- Constraints: Items must have label property

#### **5. Navbar**
```jsx
<Navbar title="Dashboard" />
```
- Props: `title` (string)
- Purpose: Top navigation bar
- Constraints: Simple title-based configuration

#### **6. Modal**
```jsx
<Modal title="Confirm" />
```
- Props: `title` (string)
- Purpose: Dialog boxes and overlays
- Constraints: Minimal prop surface

#### **7. Chart**
```jsx
<Chart title="Sales Data" />
```
- Props: `title` (string)
- Purpose: Data visualization placeholder
- Constraints: Title-only for now, visualization not implemented

### Design Patterns

#### **Deterministic Props**
All component props are:
- **Predictable**: Same input → Same output
- **Validated**: Checked against allowed list
- **Required**: All must be populated (no empty props)
- **Typed**: String arrays expected in strict formats

#### **Incremental Modification**
The system preserves existing components when modifying:
```javascript
// Plan type determines behavior
{
  "type": "create"    // Start fresh
} 
// OR
{
  "type": "modify"    // Keep existing, add/update only
}
```

#### **Component Vocabulary Constraint**
By limiting to 7 specific components:
- ✅ Ensures consistent rendering across frontend
- ✅ Reduces hallucination and invalid prop issues
- ✅ Makes the system more predictable
- ✅ Simplifies frontend component mapping

---

## API Endpoints

### POST /generate

Generates UI components based on user input.

**Request**:
```bash
POST http://localhost:3000/generate
Content-Type: application/json

{
  "message": "Create a login form with email and password fields",
  "previousCode": null
}
```

**Request Parameters**:
- `message` (required, string): User's natural language UI request
- `previousCode` (optional, string): Previous UI code for modifications

**Response**:
```json
{
  "plan": {
    "type": "create",
    "components": [...]
  },
  "code": "<>...</>",
  "explanation": "A login form was created with..."
}
```

**Response Fields**:
- `plan`: JSON object with component specifications
- `code`: Raw JSX code ready to render
- `explanation`: Human-readable description of choices

**Status Codes**:
- `200 OK`: Successful generation
- `400 Bad Request`: Missing required `message` field
- `500 Internal Server Error`: API error or invalid response

**Error Response**:
```json
{
  "message": "Internal server error"
}
```

**Example cURL Request**:
```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a dashboard with cards showing sales data",
    "previousCode": null
  }'
```

---

## Known Limitations

### 1. **Component Vocabulary Constraints**
   - Only 7 pre-defined components available
   - Cannot create custom components
   - Limited to specific prop structures
   - No component nesting beyond flat array layout

### 2. **Prop Limitations**
   - All props must be strings or simple objects
   - No function props (onClick handlers, etc.)
   - No conditional rendering within props
   - No prop composition or spreading

### 3. **AI Model Limitations**
   - May occasionally generate invalid JSON despite constraints
   - Can hallucinate props not in allowed list
   - Sometimes over-complicates simple requests
   - Inconsistent output for ambiguous requests

### 4. **Error Handling**
   - Limited error messages for invalid responses
   - No fallback when Gemini API fails
   - No request validation beyond message presence
   - JSON parsing errors not gracefully handled

### 5. **State Management**
   - No persistent storage of generated UIs
   - Cannot track modification history
   - No undo/redo capability at backend level
   - No version control for generated code

### 6. **Performance Constraints**
   - Each request makes 3 API calls (Planner, Generator, Explainer)
   - No caching of common requests
   - No rate limiting implemented
   - High API costs due to 3 calls per request

### 7. **Code Generation Quality**
   - Generated code has no runtime error checking
   - No validation that generated JSX is syntactically correct
   - No type safety or prop type validation
   - Cannot guarantee the code will render without errors

### 8. **API Constraints**
   - CORS enabled for all origins (security risk)
   - No authentication/authorization
   - No request rate limiting
   - No request size limits configured

### 9. **Modification Mode Issues**
   - "Modify" type can fail if previous code structure is unexpected
   - No intelligent diff/merge of component changes
   - Cannot partially modify individual props
   - Risk of losing components during complex modifications

---

## Future Improvements

### High Priority

1. **Robust Error Handling**
   - Implement JSON validation and parsing with fallbacks
   - Add request schema validation using joi/yup
   - Implement retry logic with exponential backoff
   - Add comprehensive error messages and logging
   - Create error codes for different failure types

2. **Expand Component Library**
   - Add Table component with columns and rows
   - Implement Calendar/DatePicker component
   - Create Dropdown/Select component
   - Add Form wrapper component with validation
   - Build Toast/Alert notification system
   - Add Carousel component for image galleries

3. **Performance Optimization**
   - Implement response caching for common requests
   - Add request batching to reduce API calls
   - Cache the planner output during modification
   - Implement request deduplication
   - Add API response streaming

### Medium Priority

4. **Enhanced Validation**
   - Validate generated JSX syntax before returning
   - Implement prop type checking
   - Add component schema validation
   - Create a component registry with validation rules
   - Implement "test rendering" to verify code works

5. **Advanced AI Features**
   - Fine-tune prompts for specific use cases
   - Add multi-turn conversation support
   - Implement component suggestion based on context
   - Add design pattern recognition
   - Create specialized agents for different component types

6. **State & Persistence**
   - Add database for storing generated UIs
   - Implement version control system
   - Create undo/redo functionality
   - Add collaboration features
   - Build UI history/timeline

### Lower Priority

7. **Security & Access Control**
   - Implement API key authentication
   - Add request rate limiting
   - Implement CORS whitelist instead of wildcard
   - Add request signing
   - Create usage analytics and quotas

8. **Developer Experience**
   - Convert to TypeScript for type safety
   - Add comprehensive JSDoc documentation
   - Create API documentation with Swagger/OpenAPI
   - Add unit tests (Jest)
   - Implement integration tests with mock AI responses
   - Add request/response logging middleware

9. **Monitoring & Operations**
   - Add structured logging (Winston, Pino)
   - Implement health check endpoint
   - Add performance metrics collection
   - Create monitoring dashboard
   - Add alert system for errors

10. **Advanced Features**
    - Support for responsive design constraints
    - Add theming/styling customization
    - Implement accessibility (a11y) guidance
    - Create component animation support
    - Add multi-language support

---

## API Call Pipeline

Each user request triggers 3 sequential API calls to Gemini:

```
1. Planner Call
   Input: User message + previous code
   Output: JSON component plan
   ↓
2. Generator Call
   Input: Plan + previous code
   Output: JSX code
   ↓
3. Explainer Call
   Input: Plan
   Output: Explanation text
   ↓
Response sent to frontend
```

**Cost Implication**: 3x the token usage for each user request

---

## Technology Stack

| Technology | Purpose |
|-----------|---------|
| **Node.js** | JavaScript runtime |
| **Express.js** | Web framework |
| **Gemini AI API** | AI model for generation |
| **@google/generative-ai** | Google AI client library |
| **CORS** | Cross-origin request handling |
| **dotenv** | Environment configuration |
| **Nodemon** | Development auto-reload |

---

## Monitoring & Debugging

### View Logs

The server logs planner output to console:
```javascript
console.log(raw); // Logs the planner's JSON output
```

### Common Issues

**Issue**: Invalid JSON from Planner
- **Cause**: Model hallucinating props or components
- **Solution**: Stricter prompt constraints or retries

**Issue**: CORS errors on frontend
- **Cause**: Frontend on different domain/port
- **Solution**: Already handled with `app.use(cors())`

**Issue**: API Key errors
- **Cause**: Invalid or missing GEMINI_API_KEY
- **Solution**: Verify .env file and API key validity

---

## Security Considerations

⚠️ **Current Implementation Notes**:
- No authentication required (development only)
- CORS open to all origins - should restrict in production
- No rate limiting - vulnerable to abuse
- API key stored in .env - keep secure
- No input sanitization - trust frontend validation

**Production Recommendations**:
- Add API key authentication
- Implement rate limiting per user/IP
- Restrict CORS to frontend domain only
- Add request size limits
- Implement audit logging

---

## Environment Variables

```bash
# Required
GEMINI_API_KEY=your_api_key_here

# Optional
PORT=3000                    # Default: 3000
NODE_ENV=development         # or production
```

---

## Deployment

### Render Deployment

1. Connect repository
2. Set GEMINI_API_KEY environment variable
3. Set start command: `npm start`
4. Deploy

---

## Questions & Support

For issues or questions, please refer to the main project repository or contact the development team.

---

**Last Updated**: February 2026
