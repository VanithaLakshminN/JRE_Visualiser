# JRE Visualizer: Cinematic JVM Runtime Simulator

![JRE Visualizer](src/assets/sample-output.png)

*A cinematic, browser-based educational tool designed to demystify how the Java Virtual Machine (JVM) executes code under the hood.*

**JRE Visualizer** is a cinematic, browser-based educational tool designed to demystify how the Java Virtual Machine (JVM) executes code under the hood. It bridges the gap between static code and dynamic memory behavior by providing a real-time, highly visual, and interactive representation of memory allocations, scope tracking, and garbage collection.

Rather than relying on flat boxes and static text, the JRE Visualizer uses a futuristic, glassmorphic HUD-style interface to make learning memory management engaging and intuitive.

---

## Live Demo

🚀 **Experience the Visualizer live here:** [https://jre-visualiser-imyw.vercel.app](https://jre-visualiser-imyw.vercel.app)

---

## What Does This Project Do?

When a user inputs Java code, the visualizer doesn't just compile and print output to a console. It actively steps through the execution, visualizing the internal state of the JVM memory architecture across four distinct quadrants:

1. **Stack Memory**: Visualizes method calls pushing and popping off the stack. It tracks local variables and primitive values inside active frames.
2. **Heap Memory**: Visualizes dynamic object instantiation. Objects float dynamically and show internal field state.
3. **Metaspace**: Shows loaded class definitions and static variables.
4. **Execution Flow**: A chronological trace of the exact runtime actions being evaluated.

---

## How It Works (Technical Flow)

The application is built completely within the browser to ensure instantaneous feedback without relying on a slow backend server.

### 1. Code Parsing (`web-tree-sitter`)
When the user clicks "Compile & Run", the raw Java code is passed into a WebAssembly-powered Tree-Sitter parser (`JavaParser.ts`). Tree-Sitter is an extremely robust incremental parsing system that generates a strict Abstract Syntax Tree (AST) for the provided code.

### 2. Runtime Interpretation (`EducationalInterpreter.ts`)
The custom tree-walking interpreter traverses the Tree-Sitter AST. Instead of just evaluating the code, it acts as a "Simulation Engine". As it evaluates variable declarations, `new` keywords, and method calls, it emits an array of **Execution Events** (e.g., `ALLOC_OBJ`, `PUSH_FRAME`, `SET_VAR`, `MARK_GC`).

### 3. State Management (`Zustand`)
The emitted event stream is loaded into the global React state store. The store manages the "step-by-step" timeline index, allowing the user to scrub forward and backward through time.

### 4. Cinematic Rendering (`Framer Motion` & `React`)
As the step index changes, the UI reacts to the current state of the store:
- **Reference Tracking**: An absolute SVG overlay (`ReferenceArrows.tsx`) reads DOM coordinates to draw live cubic bezier curves connecting stack variables directly to the physical heap objects they reference.
- **Animations**: Components use `framer-motion` to smoothly transition objects onto the heap, drop-shadow pulse active stack frames, and trigger a red ripple effect when the Garbage Collector sweeps unreferenced data.

---

## Project Structure (For Recruiters & Developers)

The codebase follows a strict separation of concerns, dividing the complex parsing logic from the React rendering layer:

```text
src/
├── components/           # UI Layer (React)
│   ├── layout/           # Main HUD wrappers (MainLayout.tsx, BottomToolbar.tsx)
│   └── quadrants/        # The 4 JVM panels: Stack, Heap, Metaspace, ExecutionFlow
│                         # (Also contains ReferenceArrows.tsx for live SVG mappings)
├── engine/               # Simulation Engine (No UI logic)
│   ├── parser/           # JavaParser.ts (Loads WASM, runs Tree-Sitter AST generation)
│   └── interpreter/      # EducationalInterpreter.ts (Walks AST, emits JVM events)
├── store/                # Global State
│   └── useJvmStore.ts    # Zustand store; holds the timeline of execution events
├── education/            # Educational explanations and hints mapping
├── data/                 # Sample Java code demos loaded into the editor
├── types.ts              # Global TypeScript interfaces for memory structures
└── index.css             # Tailwind utilities & custom CSS animations
```

---

## Technical Stack
- **Frontend Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (Custom glassmorphism, topological background grids)
- **Animations**: Framer Motion (Layout transitions, presence tracking)
- **Language Parsing**: `web-tree-sitter` & `tree-sitter-java` (WASM)
- **State Management**: Zustand

---

## Key Advantages

- **High Educational Value**: By visually separating primitives (living in the stack) from objects (living in the heap and mapped by SVG reference arrows), users immediately grasp complex concepts like Pass-by-Value, Pass-by-Reference, and Object Mutability.
- **Garbage Collection Visibility**: Unreachable heap objects are visually swept with a red scan-line, teaching memory leak prevention and Mark-and-Sweep mechanics dynamically.
- **Zero-Latency Execution**: Because the parsing and execution interpretation happen directly in the browser via WebAssembly and JavaScript, there is zero network latency, resulting in a buttery-smooth 60FPS UI.
- **Cinematic Aesthetic**: Moving away from standard white-background IDEs, the dark cyber-debugger visual language keeps users highly engaged and makes learning computer science architecture exciting.

---

## Running Locally

To run the JRE Visualizer on your own machine:

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173` in your browser.

---

## Deployment

This project is deployed on **Vercel** as a static single-page application. Because the custom Java execution engine runs entirely on the client-side within the browser, the application requires absolutely no backend infrastructure or containerized JVM to execute code securely. Vercel handles the rapid edge-caching and CI/CD directly from this GitHub repository.

---

## Author

**Vanitha Lakshmin N**  
- GitHub: [@VanithaLakshminN](https://github.com/VanithaLakshminN)
