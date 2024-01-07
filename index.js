const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const { execFile } = require('child_process');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://RunMeQuick:C8zeUyaB1x9RifRf@cluster0.3onslcg.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function executeCode(code, runtime) {
  return new Promise((resolve, reject) => {
    if (runtime === 'c++') {
      // For C++, compile the code before execution
      const compiledFileName = 'tempExecutable';
      const compileCommand = `g++ -o ${compiledFileName} -x c++ -`;

      const executionCommand = `./${compiledFileName}`;

      const fullCommand = `${compileCommand} && ${executionCommand}`;

      const childProcess = execFile('sh', ['-c', fullCommand], (error, stdout, stderr) => {
        if (error) {
          console.error("Error compiling or executing C++ code:", error);
          reject("Error compiling or executing C++ code");
          return;
        }

        console.log("Execution result:", stdout);
        resolve(stdout);
      });

      // Pass the C++ code to the child process's stdin
      childProcess.stdin.write(code);
      childProcess.stdin.end();
    } else if (runtime === 'javascript') {
      // For JavaScript, save the code to a file and execute it
      const fileName = 'tempJavaScriptFile.js';
      const fs = require('fs');

      fs.writeFileSync(fileName, code);

      const childProcess = execFile('node', [fileName], (error, stdout, stderr) => {
        if (error) {
          console.error("Error executing JavaScript code:", error);
          reject("Error executing JavaScript code");
          return;
        }

        console.log("Execution result (JavaScript):", stdout);
        resolve(stdout);
      });
    } else {
      // For other runtimes (Go), execute directly
      const command = `${runtime} -e "${code}"`;

      execFile('sh', ['-c', command], (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing ${runtime} code:`, error);
          reject(`Error executing ${runtime} code`);
          return;
        }

        console.log(`Execution result (${runtime}):`, stdout);
        resolve(stdout);
      });
    }
  });
}

async function run() {
  try {
    await client.connect();

    app.post('/api/execute', async (req, res) => {
      const { code, runtime } = req.body;

      // Check if the selected runtime is valid
      const validRuntimes = ["python", "javascript", "go", "c++"]; // Add more as needed
      if (!validRuntimes.includes(runtime)) {
        return res.status(400).json({ error: "Invalid runtime" });
      }

      try {
        const executionResult = await executeCode(code, runtime);
        res.json({ status: "Execution Complete", result: executionResult });
      } catch (error) {
        res.status(500).json({ error });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Uncomment the next line if you want to close the MongoDB connection after the server runs
    // await client.close();
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
