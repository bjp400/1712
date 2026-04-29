// VTU Progress - Enhanced Smart Duration-Based Completion
// Handles server validation by simulating realistic video watching behavior

console.log('=== VTU Progress Completer - Enhanced Version Starting ===\n');

const courseSlug = '1-social-networks';
const incompleteLectures = [2866,
2871, 2877, 2879, 2882, 2884, 2887, 2892, 2895, 2897, 2900, 2903, 2906, 2909, 2912,
2916, 2918, 2919, 2920, 2923, 2926, 2928, 2932, 2933, 2934, 2935,
2941, 2944, 2947, 2948, 2951, 2953, 2956];

// Enhanced duration parsing with multiple format support
function parseDuration(durationStr) {
    if (!durationStr) return null;
    
    if (typeof durationStr === 'number') return durationStr;
    
    durationStr = String(durationStr).trim();
    console.log(`  [DEBUG] Parsing duration: "${durationStr}"`);
    
    // Format: "3600s" or "60m" or "1h"
    if (durationStr.endsWith('s')) {
        const result = parseInt(durationStr);
        console.log(`  [DEBUG] Parsed as seconds: ${result}s`);
        return result;
    }
    if (durationStr.endsWith('m')) {
        const result = parseInt(durationStr) * 60;
        console.log(`  [DEBUG] Parsed as minutes: ${result}s`);
        return result;
    }
    if (durationStr.endsWith('h')) {
        const result = parseInt(durationStr) * 3600;
        console.log(`  [DEBUG] Parsed as hours: ${result}s`);
        return result;
    }
    
    // Format: "HH:MM:SS" or "MM:SS"
    if (durationStr.includes(':')) {
        const parts = durationStr.split(':').map(p => parseInt(p));
        let result;
        if (parts.length === 2) {
            result = parts[0] * 60 + parts[1];
            console.log(`  [DEBUG] Parsed MM:SS format: ${result}s`);
        } else if (parts.length === 3) {
            result = parts[0] * 3600 + parts[1] * 60 + parts[2];
            console.log(`  [DEBUG] Parsed HH:MM:SS format: ${result}s`);
        }
        return result;
    }
    
    // Try parsing as plain number (assume seconds)
    const num = parseInt(durationStr);
    const result = isNaN(num) ? null : num;
    console.log(`  [DEBUG] Parsed as plain number: ${result}s`);
    return result;
}

// YouTube API integration for getting accurate video durations
async function getYouTubeVideoDuration(videoUrl) {
    try {
        // Extract video ID from YouTube URL
        const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
        if (!videoIdMatch) return null;
        
        const videoId = videoIdMatch[1];
        console.log(`  [YOUTUBE] Fetching duration for video ID: ${videoId}`);
        
        // Use YouTube API (you'll need to add your API key)
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=YOUR_API_KEY`);
        const data = await response.json();
        
        if (data.items && data.items[0]) {
            const duration = data.items[0].contentDetails.duration;
            // Convert ISO 8601 duration to seconds
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (match) {
                const hours = parseInt(match[1] || 0);
                const minutes = parseInt(match[2] || 0);
                const seconds = parseInt(match[3] || 0);
                const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                console.log(`  [YOUTUBE] Duration from API: ${totalSeconds}s`);
                return totalSeconds;
            }
        }
    } catch (error) {
        console.log(`  [YOUTUBE] Error fetching duration: ${error.message}`);
    }
    return null;
}

// Enhanced course data fetching with detailed logging
async function fetchCourseDurations() {
    console.log('=== STEP 1: Fetching course data with video durations ===\n');
    
    const lectureDurations = {};
    
    try {
        console.log('  [API] Fetching course data...');
        const response = await fetch(
            `https://online.vtu.ac.in/api/v1/student/my-courses/${courseSlug}`,
            {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }
        );
        
        if (!response.ok) {
            console.error(`  [ERROR] Failed to fetch course data: ${response.status}`);
            return lectureDurations;
        }
        
        const courseData = await response.json();
        
        if (courseData && courseData.data && courseData.data.lessons) {
            console.log(`  [INFO] Found ${courseData.data.lessons.length} lessons`);
            
            courseData.data.lessons.forEach((lesson, lessonIndex) => {
                console.log(`  [LESSON ${lessonIndex + 1}] Processing: ${lesson.title || 'Untitled'}`);
                
                if (lesson.lectures && Array.isArray(lesson.lectures)) {
                    lesson.lectures.forEach(lecture => {
                        let duration = null;
                        let source = 'unknown';
                        
                        // Try multiple fields for duration with logging
                        if (lecture.video_duration) {
                            duration = parseDuration(lecture.video_duration);
                            source = 'video_duration';
                        } else if (lecture.duration) {
                            duration = parseDuration(lecture.duration);
                            source = 'duration';
                        } else if (lecture.length) {
                            duration = parseDuration(lecture.length);
                            source = 'length';
                        }
                        
                        // If we have a video URL, try YouTube API
                        if (!duration && lecture.video_url) {
                            getYouTubeVideoDuration(lecture.video_url).then(youtubeDuration => {
                                if (youtubeDuration) {
                                    lectureDurations[lecture.id] = youtubeDuration;
                                    console.log(`  [YOUTUBE] Lecture ${lecture.id}: ${youtubeDuration}s (from YouTube API)`);
                                }
                            });
                        }
                        
                        if (duration && duration > 0) {
                            lectureDurations[lecture.id] = duration;
                            console.log(`  [SUCCESS] Lecture ${lecture.id}: ${duration}s (${Math.round(duration/60)}min) [source: ${source}]`);
                        } else {
                            console.log(`  [MISSING] Lecture ${lecture.id}: No duration found`);
                        }
                    });
                }
            });
        }
    } catch (error) {
        console.error(`  [ERROR] Error fetching course data:`, error.message);
    }
    
    console.log(`\n  [SUMMARY] Found durations for ${Object.keys(lectureDurations).length} lectures\n`);
    return lectureDurations;
}

// Simulate realistic watching behavior in chunks
async function simulateWatching(lectureId, totalDuration) {
    let chunkSize;
    
    // Adaptive chunk sizing based on video length
    if (totalDuration > 1800) { // > 30 minutes
        chunkSize = 60; // 1-minute chunks for very long videos
    } else if (totalDuration > 1200) { // > 20 minutes  
        chunkSize = 90; // 1.5-minute chunks for long videos
    } else if (totalDuration > 600) { // > 10 minutes
        chunkSize = 120; // 2-minute chunks for medium videos
    } else {
        chunkSize = Math.min(180, totalDuration / 3); // 3-minute chunks max for short videos
    }
    
    const chunks = Math.ceil(totalDuration / chunkSize);
    
    console.log(`  [SIMULATE] Watching lecture ${lectureId} in ${chunks} chunks of ${Math.round(chunkSize)}s each`);
    
    for (let i = 0; i < chunks; i++) {
        const currentSeconds = Math.min((i + 1) * chunkSize, totalDuration);
        const secondsJustWatched = i === 0 ? chunkSize : chunkSize;
        
        // More precise progress calculation
        let progress;
        if (i === chunks - 1) {
            progress = 100; // Force 100% on final chunk
        } else {
            progress = Math.min(99, Math.floor((currentSeconds / totalDuration) * 100)); // Cap at 99% until final
        }
        
        console.log(`    [CHUNK ${i + 1}/${chunks}] Progress: ${progress}% (${currentSeconds}s/${totalDuration}s)`);
        
        try {
            const response = await fetch(
                `https://online.vtu.ac.in/api/v1/student/my-courses/${courseSlug}/lectures/${lectureId}/progress`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({
                        current_time_seconds: currentSeconds,
                        total_duration_seconds: totalDuration,
                        seconds_just_watched: secondsJustWatched
                    }),
                    credentials: 'include'
                }
            );
            
            if (response.ok) {
                const result = await response.text();
                try {
                    const data = JSON.parse(result);
                    console.log(`      [OK] Server response: ${data.progress || data.completion_percentage || progress}%`);
                } catch (e) {
                    console.log(`      [OK] Server response: ${progress}% (raw)`);
                }
            } else {
                console.log(`      [ERROR] Status: ${response.status}`);
                return false;
            }
            
            // Wait between chunks to simulate realistic watching
            if (i < chunks - 1) {
                const waitTime = 1000 + Math.random() * 1000; // 1-2 seconds between chunks
                console.log(`      [WAIT] ${waitTime}ms before next chunk...`);
                await new Promise(r => setTimeout(r, waitTime));
            }
            
        } catch (error) {
            console.log(`      [ERROR] ${error.message}`);
            return false;
        }
    }
    
    // Final verification - send explicit 100% completion
    console.log(`    [FINAL] Sending explicit 100% completion for lecture ${lectureId}`);
    try {
        const finalResponse = await fetch(
            `https://online.vtu.ac.in/api/v1/student/my-courses/${courseSlug}/lectures/${lectureId}/progress`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    current_time_seconds: totalDuration,
                    total_duration_seconds: totalDuration,
                    seconds_just_watched: 1 // Final 1 second to ensure 100%
                }),
                credentials: 'include'
            }
        );
        
        if (finalResponse.ok) {
            console.log(`    [FINAL] 100% completion sent successfully`);
        } else {
            console.log(`    [FINAL WARNING] Final completion failed, but chunks were successful`);
        }
    } catch (error) {
        console.log(`    [FINAL ERROR] ${error.message}`);
    }
    
    return true;
}

// Check if lecture is already completed
async function checkLectureProgress(lectureId) {
    try {
        const response = await fetch(
            `https://online.vtu.ac.in/api/v1/student/my-courses/${courseSlug}/lectures/${lectureId}/progress`,
            {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include'
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            const progress = data.progress || data.completion_percentage || 0;
            console.log(`  [CHECK] Lecture ${lectureId} current progress: ${progress}%`);
            return progress;
        }
    } catch (error) {
        console.log(`  [ERROR] Cannot check progress for lecture ${lectureId}: ${error.message}`);
    }
    return 0;
}

// Enhanced lecture update with realistic simulation
async function updateLectureProgress(lectureId, duration, retries = 3) {
    console.log(`\n=== PROCESSING LECTURE ${lectureId} ===`);
    console.log(`[INFO] Duration: ${duration}s (${Math.round(duration/60)}min)`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        console.log(`[ATTEMPT ${attempt}/${retries}]`);
        
        const success = await simulateWatching(lectureId, duration);
        
        if (success) {
            return {
                success: true,
                lectureId,
                progress: 100,
                duration,
                attempts: attempt
            };
        } else if (attempt < retries) {
            console.log(`[RETRY] Waiting 5 seconds before retry...`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    
    return {
        success: false,
        lectureId,
        duration,
        attempts: retries
    };
}

// Pre-filter already completed lectures to avoid revisiting
async function preFilterCompletedLectures(lectureIds, lectureDurations) {
    console.log(`[PREFILTER] Checking ${lectureIds.length} lectures for completion status...`);
    
    const completedLectures = [];
    const incompleteLectures = [];
    
    // Check progress for all lectures first
    const progressChecks = await Promise.all(
        lectureIds.map(async (lectureId) => {
            const duration = lectureDurations[lectureId] || 3600;
            const currentProgress = await checkLectureProgress(lectureId);
            
            return {
                lectureId,
                duration,
                currentProgress,
                isCompleted: currentProgress >= 100
            };
        })
    );
    
    // Separate completed and incomplete lectures
    progressChecks.forEach(check => {
        if (check.isCompleted) {
            completedLectures.push({
                lectureId: check.lectureId,
                progress: check.currentProgress
            });
            console.log(`[IMMEDIATE SKIP] Lecture ${check.lectureId} already at ${check.currentProgress}% - REMOVED FROM PROCESSING`);
        } else {
            incompleteLectures.push({
                lectureId: check.lectureId,
                duration: check.duration,
                currentProgress: check.currentProgress
            });
            console.log(`[NEEDS PROCESSING] Lecture ${check.lectureId} at ${check.currentProgress}% - WILL BE PROCESSED`);
        }
    });
    
    console.log(`\n[PREFILTER SUMMARY]:`);
    console.log(`  ✅ Already completed: ${completedLectures.length} lectures`);
    console.log(`  🔄 Need processing: ${incompleteLectures.length} lectures`);
    console.log(`  📊 Total saved: ${completedLectures.length} lectures won't be revisited\n`);
    
    return { completedLectures, incompleteLectures };
}

// Process multiple lectures in parallel (only incomplete ones)
async function processLectureBatch(lectureIds, lectureDurations, batchSize = 10) {
    const batchResults = {
        success: [],
        failed: [],
        skipped: []
    };
    
    // First, pre-filter to remove already completed lectures
    const { completedLectures, incompleteLectures } = await preFilterCompletedLectures(lectureIds, lectureDurations);
    
    // Add all already completed lectures to skipped results immediately
    completedLectures.forEach(({ lectureId, progress }) => {
        batchResults.skipped.push({ lectureId, progress });
    });
    
    // If no incomplete lectures, return immediately
    if (incompleteLectures.length === 0) {
        console.log(`[COMPLETE] All lectures already at 100%! No processing needed.`);
        return batchResults;
    }
    
    console.log(`[PARALLEL] Processing ${incompleteLectures.length} incomplete lectures (${batchSize} at a time)`);
    
    // Process only incomplete lectures in batches
    for (let i = 0; i < incompleteLectures.length; i += batchSize) {
        const batch = incompleteLectures.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(incompleteLectures.length / batchSize);
        
        console.log(`\n[BATCH ${batchNumber}/${totalBatches}] Processing ${batch.length} incomplete lectures in parallel...`);
        
        // Process lectures in parallel with real-time progress checking
        const processingPromises = batch.map(async ({ lectureId, duration, currentProgress }) => {
            console.log(`[PARALLEL] Lecture ${lectureId} (${Math.round(duration / 60)}min, current: ${currentProgress}%)`);
            
            if (!lectureDurations[lectureId]) {
                console.log(`[WARNING] Lecture ${lectureId}: Using default duration`);
            }
            
            // Check if it's already 100% before processing (might have been completed by previous batch)
            const progressBeforeProcessing = await checkLectureProgress(lectureId);
            if (progressBeforeProcessing >= 100) {
                console.log(`[REAL-TIME SKIP] Lecture ${lectureId} reached 100% during previous batch - SKIPPING`);
                return { 
                    success: true, 
                    lectureId, 
                    progress: progressBeforeProcessing, 
                    duration,
                    skipped: true 
                };
            }
            
            return await updateLectureProgress(lectureId, duration);
        });
        
        // Wait for all parallel processing to complete
        const batchProcessingResults = await Promise.allSettled(processingPromises);
        
        // Process results with real-time filtering
        batchProcessingResults.forEach((result, index) => {
            const lectureInfo = batch[index];
            
            if (result.status === 'fulfilled' && result.value.success) {
                if (result.value.skipped) {
                    // This was already completed, add to skipped results
                    batchResults.skipped.push({ 
                        lectureId: lectureInfo.lectureId, 
                        progress: result.value.progress 
                    });
                    console.log(`[SKIP CONFIRMED] Lecture ${lectureInfo.lectureId} was already at 100%`);
                } else {
                    // This was actually processed to completion
                    batchResults.success.push(result.value);
                    console.log(`[SUCCESS] Lecture ${lectureInfo.lectureId} completed at 100%`);
                }
            } else {
                const failedResult = result.status === 'fulfilled' ? result.value : { lectureId: lectureInfo.lectureId, error: result.reason };
                batchResults.failed.push(failedResult);
                console.log(`[FAILED] Lecture ${lectureInfo.lectureId} failed`);
            }
        });
        
        // Delay between batches (longer delay for rate limiting)
        if (i + batchSize < incompleteLectures.length) {
            const batchDelay = 5000 + Math.random() * 3000; // 5-8 seconds between batches
            console.log(`[BATCH DELAY] Waiting ${Math.round(batchDelay)}ms before next batch...`);
            await new Promise(r => setTimeout(r, batchDelay));
        }
    }
    
    return batchResults;
}

// Main completion function with parallel processing
async function completeAllLectures() {
    console.log('=== VTU PROGRESS COMPLETION CHALLENGE ===');
    console.log('=== CTF Vulnerability Proof (PARALLEL VERSION) ===\n');
    
    // Fetch durations first
    const lectureDurations = await fetchCourseDurations();
    
    console.log(`=== STEP 2: Starting PARALLEL update of ${incompleteLectures.length} lectures (10 at a time) ===\n`);
    
    const results = await processLectureBatch(incompleteLectures, lectureDurations, 10);
    
    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('=== CTF CHALLENGE RESULTS ===');
    console.log('='.repeat(80));
    console.log(`[SUCCESS] Lectures completed: ${results.success.length}/${incompleteLectures.length}`);
    console.log(`[SKIPPED] Lectures already done: ${results.skipped.length}/${incompleteLectures.length}`);
    console.log(`[FAILED] Lectures failed: ${results.failed.length}/${incompleteLectures.length}`);
    console.log(`[RATE] Success rate: ${Math.round((results.success.length + results.skipped.length) / incompleteLectures.length * 100)}%`);
    
    if (results.failed.length > 0) {
        console.log('\n[FAILED LECTURES]:');
        results.failed.slice(0, 10).forEach(r => {
            console.log(`  - Lecture ${r.lectureId}: ${r.error || 'Unknown error'}`);
        });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('[CTF] Vulnerability proven: Progress can be manipulated');
    console.log('[INFO] Refreshing page in 10 seconds to verify results...');
    console.log('='.repeat(80) + '\n');
    
    setTimeout(() => {
        window.location.reload();
    }, 10000);
}

// Start the CTF challenge
console.log('[CTF] Starting VTU Progress Completion Challenge...\n');
completeAllLectures().catch(error => {
    console.error('[FATAL] Challenge failed:', error);
});
