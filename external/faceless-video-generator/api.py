"""
FastAPI wrapper for faceless-video-generator
Provides REST API endpoints for video generation
"""

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import subprocess
import uuid
import os
import json
from datetime import datetime
from pathlib import Path

app = FastAPI(title="Faceless Video Generator API")

# Job storage (in production, use Redis or database)
jobs = {}

# Configuration
OUTPUT_DIR = Path("/app/output")
OUTPUT_DIR.mkdir(exist_ok=True)

class VideoRequest(BaseModel):
    story_type: str = "custom"
    image_style: str = "default"
    voice: str = "radiant-girl"
    custom_topic: Optional[str] = None
    video_title: str
    scenes: List[str]
    output_language: str = "English"
    tone: str = "Neutral"
    num_scenes: int = 10
    quick_pace: bool = False

class JobStatus(BaseModel):
    job_id: str
    status: str
    progress: int
    video_url: Optional[str] = None
    error: Optional[str] = None
    created_at: str

@app.get("/")
async def root():
    return {
        "service": "Faceless Video Generator API",
        "version": "1.0.0",
        "status": "running"
    }

@app.post("/generate")
async def generate_video(request: VideoRequest, background_tasks: BackgroundTasks):
    """Start video generation job"""
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Initialize job
    jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "video_url": None,
        "error": None,
        "created_at": datetime.now().isoformat()
    }
    
    # Start background task
    background_tasks.add_task(process_video_generation, job_id, request)
    
    return {
        "success": True,
        "job_id": job_id,
        "message": "Video generation started"
    }

@app.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """Get job status"""
    
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "success": True,
        **jobs[job_id]
    }

@app.get("/download/{job_id}")
async def download_video(job_id: str):
    """Download generated video"""
    
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs[job_id]
    
    if job["status"] != "complete":
        raise HTTPException(status_code=400, detail="Video not ready")
    
    video_path = OUTPUT_DIR / f"{job_id}.mp4"
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(
        path=str(video_path),
        media_type="video/mp4",
        filename=f"faceless_video_{job_id}.mp4"
    )

async def process_video_generation(job_id: str, request: VideoRequest):
    """Background task to generate video"""
    
    try:
        # Update status
        jobs[job_id]["status"] = "generating"
        jobs[job_id]["progress"] = 10
        
        # Prepare config for Python script
        config_file = OUTPUT_DIR / f"{job_id}_config.json"
        
        # Map our API parameters to the Python script's expected format
        story_type_map = {
            "custom": "Custom Topic",
            "scary": "Scary",
            "mystery": "Mystery",
            "bedtime": "Bedtime",
            "history": "Interesting History",
            "urban": "Urban Legends",
            "motivational": "Motivational",
            "facts": "Fun Facts",
            "jokes": "Long Form Jokes",
            "tips": "Life Pro Tips",
            "philosophy": "Philosophy",
            "love": "Love"
        }
        
        image_style_map = {
            "default": "photorealistic",
            "pixar-art": "pixar-art",
            "anime": "anime",
            "comic": "comic-book",
            "lego": "lego",
            "cinematic": "cinematic"
        }
        
        voice_map = {
            "radiant-girl": "alloy",
            "magnetic-voiced-man": "onyx",
            "compelling-lady": "nova",
            "expressive-narrator": "fable",
            "trustworthy-man": "echo",
            "graceful-lady": "shimmer",
            "aussie-bloke": "onyx",
            "whispering-girl": "nova",
            "diligent-man": "echo",
            "gentle-voiced-man": "alloy"
        }
        
        # Configure to use FAL instead of Replicate
        env["USE_FAL_API"] = "true"
        env["FAL_KEY"] = os.environ.get("FAL_KEY", "")
        
        # Create scenes file
        scenes_file = OUTPUT_DIR / f"{job_id}_scenes.txt"
        with open(scenes_file, "w") as f:
            for scene in request.scenes:
                f.write(f"{scene}\n")
        
        jobs[job_id]["progress"] = 20
        
        # Build command to run Python script
        # Note: The original script is interactive, we'll need to modify it
        # For now, we'll create a wrapper script
        
        script_path = "/app/generator/src/main.py"
        
        # Set environment variables
        env = os.environ.copy()
        env["VIDEO_TITLE"] = request.video_title
        env["STORY_TYPE"] = story_type_map.get(request.story_type, "Custom Topic")
        env["IMAGE_STYLE"] = image_style_map.get(request.image_style, "photorealistic")
        env["VOICE"] = voice_map.get(request.voice, "alloy")
        env["OUTPUT_DIR"] = str(OUTPUT_DIR)
        env["JOB_ID"] = job_id
        env["CUSTOM_TOPIC"] = request.custom_topic or ""
        env["NUM_SCENES"] = str(request.num_scenes)
        
        jobs[job_id]["progress"] = 30
        
        # Run the Python script
        # NOTE: The original script needs to be modified to accept CLI arguments
        # For now, this is a placeholder that shows the architecture
        
        process = subprocess.Popen(
            ["python", script_path],
            cwd="/app/generator",
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Monitor progress
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            raise Exception(f"Video generation failed: {stderr}")
        
        jobs[job_id]["progress"] = 90
        
        # Find generated video (the script outputs to a specific directory)
        # This will need to be adjusted based on actual output location
        generated_video = None
        for ext in [".mp4", ".avi", ".mov"]:
            potential_path = OUTPUT_DIR / f"{job_id}{ext}"
            if potential_path.exists():
                generated_video = potential_path
                break
        
        if not generated_video:
            # Look for most recent video in output
            video_files = list(OUTPUT_DIR.glob("*.mp4"))
            if video_files:
                generated_video = max(video_files, key=os.path.getctime)
                # Rename to job_id
                new_path = OUTPUT_DIR / f"{job_id}.mp4"
                generated_video.rename(new_path)
                generated_video = new_path
        
        if not generated_video:
            raise Exception("Generated video not found")
        
        # Update job status
        jobs[job_id]["status"] = "complete"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["video_url"] = f"/download/{job_id}"
        
    except Exception as e:
        print(f"Error generating video for job {job_id}: {str(e)}")
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "jobs_count": len(jobs)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
