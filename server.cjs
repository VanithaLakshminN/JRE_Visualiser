const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const TEMP_DIR = path.join(__dirname, 'temp_java_execution');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

app.post('/run', (req, res) => {
  const { code, input } = req.body;
  if (!code) return res.status(400).json({ error: "Code is required" });

  // Extract public class name
  const match = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
  const className = match ? match[1] : 'Main';
  
  // Create a unique execution folder to prevent race conditions
  const execId = crypto.randomBytes(8).toString('hex');
  const execDir = path.join(TEMP_DIR, execId);
  fs.mkdirSync(execDir);

  const filePath = path.join(execDir, `${className}.java`);
  fs.writeFileSync(filePath, code);

  // Compile
  const javac = spawn('javac', [filePath], { cwd: execDir });
  
  let compileError = '';
  javac.stderr.on('data', data => compileError += data.toString());

  javac.on('close', (compileCode) => {
    if (compileCode !== 0) {
      fs.rmSync(execDir, { recursive: true, force: true });
      return res.json({ success: false, output: compileError || "Compilation failed" });
    }

    // Run
    const java = spawn('java', [className], { cwd: execDir });
    let runOutput = '';
    
    java.stdout.on('data', data => runOutput += data.toString());
    java.stderr.on('data', data => runOutput += data.toString());

    // Write standard input if provided
    if (input) {
      java.stdin.write(input + '\n');
    }
    java.stdin.end();

    // Timeout to prevent infinite loops (5 seconds)
    const timeout = setTimeout(() => {
      java.kill();
      runOutput += "\n[Execution Timed Out after 5 seconds]";
    }, 5000);

    java.on('close', () => {
      clearTimeout(timeout);
      fs.rmSync(execDir, { recursive: true, force: true });
      res.json({ success: true, output: runOutput });
    });
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Java Execution Backend running on http://localhost:${PORT}`);
});
