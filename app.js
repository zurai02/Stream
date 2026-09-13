// Hardcoded workflow YAML configuration targeting the /source folder architecture
const workflowYaml = `name: 📡 Serverless Video Loop Dashboard

on:
  push:
    paths:
      - 'source/**'
  workflow_dispatch:

jobs:
  stream:
    runs-on: ubuntu-latest
    steps:
    - name: 📥 Download Repository Assets
      uses: actions/checkout@v4

    - name: ⚙️ Install FFmpeg Media Engine
      run: |
        sudo apt-get update
        sudo apt-get install -y ffmpeg

    - name: 🚀 Start Infinite Stream Loop
      run: |
        VIDEO_PATH=$(ls source/*.* | head -n 1)
        if [ -z "$VIDEO_PATH" ]; then
          echo "⚠️ Error: No video found in source/"
          exit 1
        fi
        ffmpeg -re -stream_loop -1 -i "$VIDEO_PATH" \\
        -c:v libx264 -preset veryfast -b:v 4500k -maxrate 4500k -bufsize 9000k \\
        -pix_fmt yuv420p -g 60 -c:a aac -b:a 128k -ar 44100 \\
        -f flv "rtmp://://youtube.com\${{ secrets.YOUTUBE_STREAM_KEY }}"`;

document.addEventListener("DOMContentLoaded", () => {
    // Standard Dashboard UI Elements
    const videoInput = document.getElementById("videoFile");
    const videoPreview = document.getElementById("localPreview");
    const actionBtn = document.getElementById("actionBtn");
    const statusDot = document.getElementById("statusDot");
    const liveStatusText = document.getElementById("liveStatusText");
    const yamlOutput = document.getElementById("yamlOutput");
    const loopIteration = document.getElementById("loopIteration");

    // GitHub Integration Elements
    const ghToken = document.getElementById("ghToken");
    const ghUser = document.getElementById("ghUser");
    const ghRepo = document.getElementById("ghRepo");
    const deployWorkflowBtn = document.getElementById("deployWorkflowBtn");
    const uploadVideoBtn = document.getElementById("uploadVideoBtn");
    const uploadStatus = document.getElementById("uploadStatus");

    let isEngineActive = false;
    let iterationCount = 0;

    yamlOutput.value = workflowYaml;

    // Handle Local Video Preview Tracking
    videoInput.addEventListener("change", function() {
        if (this.files && this.files[0]) {
            const objectURL = URL.createObjectURL(this.files[0]);
            videoPreview.src = objectURL;
            videoPreview.style.display = "block";
        }
    });

    videoPreview.addEventListener('seeked', () => {
        if (videoPreview.currentTime === 0 && isEngineActive) {
            iterationCount++;
            loopIteration.innerText = iterationCount;
        }
    });

    actionBtn.addEventListener("click", () => {
        if (!videoInput.files || videoInput.files.length === 0) {
            alert("Execution Denied: Select a local valid media asset file structure first.");
            return;
        }
        isEngineActive = !isEngineActive;
        if (isEngineActive) {
            videoPreview.play();
            statusDot.classList.add("active");
            liveStatusText.innerText = "LOCAL SIMULATION ENGINE ACTIVE";
            liveStatusText.style.color = "var(--status-live)";
            actionBtn.innerText = "Terminate Engine Instance";
            actionBtn.className = "btn btn-danger";
        } else {
            videoPreview.pause();
            statusDot.classList.remove("active");
            liveStatusText.innerText = "ENGINE OFFLINE";
            liveStatusText.style.color = "var(--text-primary)";
            actionBtn.innerText = "Initialize Local Engine Instance";
            actionBtn.className = "btn btn-primary";
            iterationCount = 0;
            loopIteration.innerText = "0";
        }
    });

    // Helper function to handle GitHub API calls securely
    async function pushToGitHub(path, contentBase64) {
        const token = ghToken.value.trim();
        const user = ghUser.value.trim();
        const repo = ghRepo.value.trim();

        if (!token || !user || !repo) {
            throw new Error("Missing credentials. Complete all GitHub integration input fields.");
        }

        const url = `https://github.com{user}/${repo}/contents/${path}`;
        
        // Step A: Check if the file already exists to get its SHA hash (needed for overwrites)
        let sha = null;
        try {
            const checkRes = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                sha = checkData.sha;
            }
        } catch (e) { /* File doesn't exist yet, safe to skip */ }

        // Step B: Push the payload data
        const bodyPayload = {
            message: `Cloud automation update: ${path}`,
            content: contentBase64
        };
        if (sha) bodyPayload.sha = sha;

        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Accept": "application/vnd.github+json"
            },
            body: JSON.stringify(bodyPayload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || "Network write failure.");
        }
        return true;
    }

    // Button 1: Pushes .github/workflows/stream.yml straight to GitHub
    deployWorkflowBtn.addEventListener("click", async () => {
        try {
            uploadStatus.innerText = "Processing manifest deployment...";
            uploadStatus.style.color = "var(--brand-primary)";
            
            const encodedYaml = btoa(unescape(encodeURIComponent(workflowYaml)));
            
            await pushToGitHub(".github/workflows/stream.yml", encodedYaml);
            uploadStatus.innerText = "✓ Workflow manifest successfully deployed to .github/workflows/stream.yml";
            uploadStatus.style.color = "var(--status-live)";
        } catch (error) {
            uploadStatus.innerText = `Deployment Error: ${error.message}`;
            uploadStatus.style.color = "var(--status-error)";
        }
    });

    // Button 2: Reads your selected local file and uploads it into source/ folder
    uploadVideoBtn.addEventListener("click", () => {
        if (!videoInput.files || videoInput.files.length === 0) {
            alert("Please select a video file in the file picker panel first.");
            return;
        }

        const file = videoInput.files[0]; // FIX: Target the first individual File object

        uploadStatus.innerText = "Reading file into web buffer...";
        uploadStatus.style.color = "var(--brand-primary)";

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                // FIX: Extract clean base64 data string by splitting and grabbing index 1
                const base64Data = reader.result.split(",")[1];
                uploadStatus.innerText = `Pushing ${file.name} straight to GitHub API instance storage...`;
                
                await pushToGitHub(`source/${file.name}`, base64Data);
                uploadStatus.innerText = `✓ Successfully uploaded ${file.name} to source/ folder. Stream initiated!`;
                uploadStatus.style.color = "var(--status-live)";
            } catch (error) {
                uploadStatus.innerText = `Upload Error: ${error.message}`;
                uploadStatus.style.color = "var(--status-error)";
            }
        };
    });
});
