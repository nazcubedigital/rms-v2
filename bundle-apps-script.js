import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bundle() {
  console.log("Starting Google Apps Script compiler...");

  const distDir = path.join(__dirname, "dist");
  const assetsDir = path.join(__dirname, "dist", "assets");

  if (!fs.existsSync(distDir) || !fs.existsSync(assetsDir)) {
    console.error("Error: Please run 'npm run build' before compiling.");
    process.exit(1);
  }

  // Read files in assets
  const files = fs.readdirSync(assetsDir);
  const jsFile = files.find(f => f.endsWith(".js"));
  const cssFile = files.find(f => f.endsWith(".css"));

  if (!jsFile || !cssFile) {
    console.error("Error: Could not locate compiled JS or CSS files in dist/assets.");
    process.exit(1);
  }

  console.log(`Found compiled script: ${jsFile}`);
  console.log(`Found compiled style: ${cssFile}`);

  const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), "utf8");
  const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), "utf8");

  // Keep CSS simple - let's write CSS directly to a CSS html chunk file (no base64 needed)
  const cssHtmlPath = path.join(__dirname, "google-apps-script-css_style.html");
  fs.writeFileSync(cssHtmlPath, cssContent, "utf8");
  console.log(`Successfully compiled CSS assembly: ${cssHtmlPath}`);

  // Base64 encode the Javascript code to completely bypass raw comparison operations (like < and >)
  const jsBase64 = Buffer.from(jsContent, "utf8").toString("base64");

  // Chunk size: ~350,000 characters to ensure each chunk stays well below Google Apps Script limits (~1MB)
  const chunkSize = 350000;
  const jsChunks = [];
  for (let i = 0; i < jsBase64.length; i += chunkSize) {
    jsChunks.push(jsBase64.substring(i, i + chunkSize));
  }

  console.log(`Successfully split JavaScript bundle into ${jsChunks.length} chunks.`);

  // Write out chunk files and clear any old ones
  const prefix = "google-apps-script-js_chunk_";
  // Clean old matching files first
  const dirFiles = fs.readdirSync(__dirname);
  for (const f of dirFiles) {
    if (f.startsWith(prefix)) {
      fs.unlinkSync(path.join(__dirname, f));
    }
  }

  // Write new chunk files
  jsChunks.forEach((chunk, idx) => {
    const chunkPath = path.join(__dirname, `google-apps-script-js_chunk_${idx}.html`);
    fs.writeFileSync(chunkPath, chunk, "utf8");
    console.log(`Written segment chunk #${idx}: ${chunkPath}`);
  });

  // Dynamically generate the client loader scriptlets for Index.html
  let scriptletInjections = "";
  for (let i = 0; i < jsChunks.length; i++) {
    scriptletInjections += `          + "<?!= HtmlService.createHtmlOutputFromFile('js_chunk_${i}').getContent(); ?>"\n`;
  }

  // Create the final standalone Google Apps Script Index.html
  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nazcube Residences Management System</title>
    <!-- Injected by Google Apps Script compiler -->
    <script>
      window.GOOGLE_SCRIPT_URL = "<?= scriptUrl ?>";
    </script>
    <style>
      <?!= HtmlService.createHtmlOutputFromFile('css_style').getContent(); ?>
    </style>
    <!-- Load html2pdf from CDN directly to keep bundle size light and fast -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" referrerPolicy="no-referrer"></script>
  </head>
  <body>
    <div id="root"></div>
    <script>
      (function() {
        console.log("Assembling bundle slices dynamically...");
        var jsBase64 = ""
${scriptletInjections.trimEnd()};
        
        console.log("Decompressing binary app segment...");
        var jsContent = new TextDecoder("utf-8").decode(Uint8Array.from(atob(jsBase64), function(c) { return c.charCodeAt(0); }));
        
        console.log("Evaluating software client...");
        var script = document.createElement('script');
        script.type = 'module';
        script.text = jsContent;
        document.body.appendChild(script);
      })();
    </script>
  </body>
</html>`;

  // Write compiled HTML
  const outHtmlPath = path.join(__dirname, "google-apps-script-index.html");
  fs.writeFileSync(outHtmlPath, htmlContent, "utf8");
  console.log(`Successfully compiled standalone single file index: ${outHtmlPath}`);

  // 2. Compile code.gs (deployable Google Apps Script file with doGet updated to serve index)
  let rawGasCode = fs.readFileSync(path.join(__dirname, "google-apps-script.js"), "utf8");

  const replacementDoGet = `/**
 * GET Request
 * Serves the embedded HTML web page or responds with database JSON under query parameters
 */
function doGet(e) {
  const ss = getSpreadsheet();
  const action = e.parameter.action;
  
  // If no action parameter is supplied, render the standalone Single Page Application
  if (!action) {
    var template = HtmlService.createTemplateFromFile('Index');
    // Inject the active web app executive URL so the frontend automatically networks
    template.scriptUrl = ScriptApp.getService().getUrl();
    return template.evaluate()
      .setTitle("Nazcube Residences Management System")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  
  if (action === "test") {
    return jsonResponse({ status: "success", message: "Connection successful!" });
  }
  
  if (action === "readAll") {
    return jsonResponse(readAllSheetsData(ss));
  }
  
  return jsonResponse({ status: "error", message: "Unknown GET action: " + action });
}`;

  rawGasCode = rawGasCode.replace(/function doGet\(e\) {[\s\S]*?^}/m, replacementDoGet);

  const outGsPath = path.join(__dirname, "google-apps-script-deployable.gs");
  fs.writeFileSync(outGsPath, rawGasCode, "utf8");
  console.log(`Successfully compiled deployable server script: ${outGsPath}`);
}

bundle().catch(err => {
  console.error("Compilation error:", err);
  process.exit(1);
});
