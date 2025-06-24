import {
    FilesetResolver,
    GestureRecognizer,
  } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";
  
  let video, canvas, ctx, recognizer;
  const NUM_HANDS = 2;
  const currentGestures = Array(NUM_HANDS).fill("None");
  const currentPositions = Array(NUM_HANDS)
    .fill(null)
    .map(() => ({ x: 0, y: 0 }));
  
  const gestureListeners = [];
  const handMoveListeners = [];
  const handCurlListeners = [];
  const fingersDistanceListeners = [];
  const pinchAmountListeners = [];
  const fingerCountListeners = [];
  const shapeSelectionListeners = [];
  const handRotationListeners = [];
  
  let lastDistance = null;
  
  // Performance optimization variables
  let frameCount = 0;
  let lastProcessTime = 0;
  const TARGET_FPS = 30;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;
  
  // Store finger counts for both hands
  const fingersCache = [
    { hand: 0, fingers: 0, lastStableCount: 0, stableFrames: 0 },
    { hand: 1, fingers: 0, lastStableCount: 0, stableFrames: 0 }
  ];
  
  // Enhanced shape selection state
  let shapeSelectionMode = false;
  let confirmationTimeout = null;
  let pendingShapeSelection = null;
  let lastFingerCount = -1;
  let stableFingerFrames = 0;
  let confirmationFistFrames = 0;
  let maxFingerCount = 10;
  let maxFingerCountTimeout = null;
  let currentShapeMode = 'basic';
  
  const SHAPE_CONFIRMATION_WINDOW = 1000;
  const STABLE_FINGER_FRAMES = 3;
  const STABLE_FRAMES_REQUIRED = 2;
  const CONFIRMATION_FIST_FRAMES = 3;
  const MAX_FINGER_MEMORY = 2500;
  const CANCEL_DELAY = 500;
  
  // Scaling state management
  let scalingSession = {
    active: false,
    initialDistance: null,
    baseScale: 1,
    lastValidDistance: null
  };
  
  // Subscription methods
  export const onGestureChange = (callback) => gestureListeners.push(callback);
  export const onHandMove = (callback) => handMoveListeners.push(callback);
  export const onHandCurlChange = (callback) => handCurlListeners.push(callback);
  export const onFingersDistanceChange = (callback) =>
    fingersDistanceListeners.push(callback);
  export const onPinchAmountChange = (callback) =>
    pinchAmountListeners.push(callback);
  export const onFingerCountChange = (callback) =>
    fingerCountListeners.push(callback);
  export const onShapeSelection = (callback) =>
    shapeSelectionListeners.push(callback);
  export const onHandRotation = (callback) => handRotationListeners.push(callback);
  
  // Notification helpers
  const notifyGestureChange = (handIndex, newGesture) => {
    for (const cb of gestureListeners) cb({ handIndex, gesture: newGesture });
  };
  const notifyHandMove = (handIndex, x, y) => {
    for (const cb of handMoveListeners) cb({ handIndex, x, y });
  };
  const notifyHandCurlChange = (handIndex, curlAmount) => {
    for (const cb of handCurlListeners) cb({ handIndex, curlAmount });
  };
  const notifyPinchAmountChange = (pinchAmount) => {
    for (const cb of pinchAmountListeners) cb(pinchAmount);
  };
  const notifyFingerCountChange = (fingerData) => {
    for (const cb of fingerCountListeners) cb(fingerData);
  };
  const notifyShapeSelection = (selectionData) => {
    for (const cb of shapeSelectionListeners) cb(selectionData);
  };
  const notifyHandRotation = (handIndex, rotation) => {
    for (const cb of handRotationListeners) cb({ handIndex, rotation });
  };
  
  // Calculate average finger curl (0=open, 1=closed)
  function getHandCurlAmount(landmarks) {
    if (!landmarks) return 0;
  
    const fingerDistances = [
      Math.hypot(
        landmarks[8].x - landmarks[5].x,
        landmarks[8].y - landmarks[5].y
      ),
      Math.hypot(
        landmarks[12].x - landmarks[9].x,
        landmarks[12].y - landmarks[9].y
      ),
      Math.hypot(
        landmarks[16].x - landmarks[13].x,
        landmarks[16].y - landmarks[13].y
      ),
      Math.hypot(
        landmarks[20].x - landmarks[17].x,
        landmarks[20].y - landmarks[17].y
      ),
    ];
  
    const maxDistance = 0.15;
    const minDistance = 0.03;
  
    const curls = fingerDistances.map((d) => {
      let normalized = (maxDistance - d) / (maxDistance - minDistance);
      return Math.min(Math.max(normalized, 0), 1);
    });
  
    return curls.reduce((a, b) => a + b, 0) / curls.length;
  }
  
  function isHandClosed(landmarks) {
    return getHandCurlAmount(landmarks) > 0.7;
  }
  
  // Setup video input with lower resolution for better performance
  const setupVideo = async () => {
    video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.style.display = "none";
    document.querySelector("main").appendChild(video);
  
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, max: 30 },
      },
    });
    video.srcObject = stream;
  
    return new Promise((resolve) => {
      video.onloadedmetadata = () => resolve(video);
    });
  };
  
  // Create MediaPipe GestureRecognizer instance
  const createGestureRecognizer = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
  
    return await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: NUM_HANDS,
    });
  };
  
  function getDistance(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }
  
  // Thumb detection
  function isThumbExtended(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;
    
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];
    const indexMcp = landmarks[5];
    
    const thumbToIndex = getDistance(thumbTip, indexMcp);
    const palmWidth = getDistance(thumbMcp, indexMcp);
    
    const isOutward = thumbToIndex > palmWidth * 0.7;
    const isExtended = getDistance(thumbTip, thumbMcp) > getDistance(thumbIp, thumbMcp);
    
    return isOutward && isExtended;
  }
  
  // Function to check if a single finger is extended
  function isFingerExtended(landmarks, fingerTipIdx, pipIdx, mcpIdx) {
    if (fingerTipIdx === 4) {
      return isThumbExtended(landmarks);
    }
  
    const tip = landmarks[fingerTipIdx];
    const pip = landmarks[pipIdx];
    const mcp = landmarks[mcpIdx];
    
    const isAbovePip = tip.y < pip.y;
    const tipToMcp = getDistance(tip, mcp);
    const pipToMcp = getDistance(pip, mcp);
    const isExtendedFromMcp = tipToMcp > pipToMcp * 0.8;
    
    return isAbovePip && isExtendedFromMcp;
  }
  
  // Function to count extended fingers with stability checking
  function countExtendedFingers(landmarks, handIndex) {
    if (!landmarks || landmarks.length === 0) return 0;
  
    let extendedFingers = 0;
  
    // Count each finger
    if (isFingerExtended(landmarks, 4, 3, 2)) extendedFingers++; // Thumb
    if (isFingerExtended(landmarks, 8, 7, 5)) extendedFingers++; // Index
    if (isFingerExtended(landmarks, 12, 11, 9)) extendedFingers++; // Middle
    if (isFingerExtended(landmarks, 16, 15, 13)) extendedFingers++; // Ring
    if (isFingerExtended(landmarks, 20, 19, 17)) extendedFingers++; // Pinky
  
    // Stability checking
    const cache = fingersCache[handIndex];
    if (extendedFingers === cache.lastStableCount) {
      cache.stableFrames++;
    } else {
      cache.stableFrames = 0;
      cache.lastStableCount = extendedFingers;
    }
  
    // Only update if count has been stable for required frames
    if (cache.stableFrames >= STABLE_FRAMES_REQUIRED) {
      cache.fingers = extendedFingers;
    }
    
    return cache.fingers;
  }
  
  // Enhanced shape mapping with more options
  function getShapeFromFingerCount(fingerCount) {
    const shapeMap = {
      basic: {
        3: { type: 'shape', value: 'triangle', label: 'Driehoek' },
        4: { type: 'shape', value: 'cube', label: 'Vierkant' },
        5: { type: 'shape', value: 'pentagon', label: 'Vijfhoek' },
        6: { type: 'shape', value: 'hexagon', label: 'Zeshoek' }
      },
      star: {
        4: { type: 'star', value: 'star4', label: '4-punten ster' },
        5: { type: 'star', value: 'star5', label: '5-punten ster' },
        7: { type: 'star', value: 'star7', label: '7-punten ster' },
        10: { type: 'star', value: 'star10', label: '10-punten ster' }
      }
    };
    
    return (shapeMap[currentShapeMode] && shapeMap[currentShapeMode][fingerCount]) || null;
  }
  
  // Enhanced shape selection logic
  function handleShapeSelection(totalFingers, result) {
    // Get total fingers from both hands
    const totalFingerCount = fingersCache[0].fingers + fingersCache[1].fingers;

    // Check for fist confirmation if in selection mode
    if (shapeSelectionMode && result.landmarks[0]) {
      if (isHandClosed(result.landmarks[0])) {
        confirmationFistFrames++;
        if (confirmationFistFrames >= CONFIRMATION_FIST_FRAMES) {
          confirmShapeSelection();
          return;
        }
      } else {
        confirmationFistFrames = 0;
      }
    }

    // Update maximum finger count
    if (totalFingerCount > maxFingerCount) {
      maxFingerCount = totalFingerCount;
      // Reset the timeout when we see a new maximum
      if (maxFingerCountTimeout) {
        clearTimeout(maxFingerCountTimeout);
      }
      maxFingerCountTimeout = setTimeout(() => {
        if (shapeSelectionMode) return; // Don't reset if in selection mode
        maxFingerCount = 0;
      }, MAX_FINGER_MEMORY);
    }

    // Use either current fingers or remembered maximum if in selection mode
    const effectiveFingers = shapeSelectionMode ? Math.max(totalFingerCount, maxFingerCount) : totalFingerCount;

    // Stability check for finger count
    if (effectiveFingers === lastFingerCount) {
      stableFingerFrames++;
    } else {
      // Don't reset frames completely, just reduce them for more stability
      stableFingerFrames = Math.max(0, stableFingerFrames - 1);
      lastFingerCount = effectiveFingers;
    }

    // Only proceed if finger count is stable
    if (stableFingerFrames < STABLE_FINGER_FRAMES) {
      return;
    }

    // Handle shape preview (3-10 fingers)
    if (effectiveFingers >= 3 && effectiveFingers <= 10) {
      // If this is a new selection or we're not in preview mode
      if (pendingShapeSelection !== effectiveFingers || !shapeSelectionMode) {
        startShapePreview(effectiveFingers);
      }
    }
    // Reset if fingers are invalid
    else if (totalFingerCount < 3) {
      if (!shapeSelectionMode) {
        // Add delay before resetting max count
        setTimeout(() => {
          if (!shapeSelectionMode) {
            maxFingerCount = 0;
          }
        }, CANCEL_DELAY);
      }
    }
  }
  
  function startShapePreview(fingerCount) {
    // Clear any existing timeouts
    clearShapeTimeouts();
    
    pendingShapeSelection = fingerCount;
    shapeSelectionMode = true;
    confirmationFistFrames = 0;
    maxFingerCount = Math.max(maxFingerCount, fingerCount); // Ensure max is updated
    
    const shapeInfo = getShapeFromFingerCount(fingerCount);
    
    // Show immediate preview
    notifyShapeSelection({ 
      type: 'preview', 
      fingerCount: fingerCount,
      shapeInfo: shapeInfo
    });
    
    console.log(`Shape preview started: ${shapeInfo?.label || 'Unknown'} (${fingerCount} fingers)`);
    
    // Set timeout to automatically cancel if no confirmation
    confirmationTimeout = setTimeout(() => {
      // Only cancel if we haven't seen higher finger counts recently
      if (maxFingerCount <= fingerCount) {
        console.log(`Shape selection timed out for ${fingerCount} fingers`);
        cancelShapeSelection();
      }
    }, SHAPE_CONFIRMATION_WINDOW);
  }
  
  function confirmShapeSelection() {
    if (!pendingShapeSelection || !shapeSelectionMode) return;
    
    const shapeInfo = getShapeFromFingerCount(pendingShapeSelection);
    
    notifyShapeSelection({ 
      type: 'confirm', 
      fingerCount: pendingShapeSelection,
      shapeInfo: shapeInfo
    });
    
    console.log(`Shape confirmed: ${shapeInfo?.label || 'Unknown'} (${pendingShapeSelection} fingers)`);
    
    // Reset state
    resetShapeSelection();
  }
  
  function cancelShapeSelection() {
    if (shapeSelectionMode) {
      console.log('Shape selection cancelled');
      
      notifyShapeSelection({ 
        type: 'cancel', 
        fingerCount: pendingShapeSelection
      });
    }
    
    resetShapeSelection();
  }
  
  function resetShapeSelection() {
    clearShapeTimeouts();
    shapeSelectionMode = false;
    pendingShapeSelection = null;
    confirmationFistFrames = 0;
    stableFingerFrames = 0;
    lastFingerCount = -1;
    maxFingerCount = 0;
    if (maxFingerCountTimeout) {
      clearTimeout(maxFingerCountTimeout);
    }
  }
  
  function clearShapeTimeouts() {
    if (confirmationTimeout) {
      clearTimeout(confirmationTimeout);
      confirmationTimeout = null;
    }
    if (maxFingerCountTimeout) {
      clearTimeout(maxFingerCountTimeout);
      maxFingerCountTimeout = null;
    }
  }
  
  // Get total fingers up across both hands
  function getTotalFingersUp() {
    return fingersCache[0].fingers + fingersCache[1].fingers;
  }
  
  // Enhanced scaling with session management
  function handleScaling(result) {
    const bothHandsDetected = result.landmarks[0] && result.landmarks[1];
    
    if (bothHandsDetected) {
      // Check if both hands are in scaling position (index fingers extended)
      const hand0IndexExtended = result.landmarks[0] && isFingerExtended(result.landmarks[0], 8, 7, 5);
      const hand1IndexExtended = result.landmarks[1] && isFingerExtended(result.landmarks[1], 8, 7, 5);
      
      if (hand0IndexExtended && hand1IndexExtended) {
        const finger1 = result.landmarks[0][8];
        const finger2 = result.landmarks[1][8];
        const currentDistance = getDistance(finger1, finger2);
        
        if (!scalingSession.active) {
          // Start new scaling session
          scalingSession.active = true;
          scalingSession.initialDistance = currentDistance;
          scalingSession.baseScale = 1; // You might want to get current scale from your main script
          scalingSession.lastValidDistance = currentDistance;
        } else {
          // Continue scaling session
          scalingSession.lastValidDistance = currentDistance;
          notifyPinchAmountChange(currentDistance);
        }
      } else {
        // Exit scaling mode if fingers not in position
        if (scalingSession.active) {
          scalingSession.active = false;
          scalingSession.initialDistance = null;
        }
      }
    } else {
      // Maintain last valid distance when hands leave frame
      if (scalingSession.active && scalingSession.lastValidDistance !== null) {
        // Don't reset scaling, keep last known state
        return;
      } else {
        // End scaling session if it wasn't active
        scalingSession.active = false;
        scalingSession.initialDistance = null;
        if (lastDistance !== null) {
          lastDistance = null;
          notifyPinchAmountChange(null);
        }
      }
    }
  }
  
  // Utility function for angle normalization
  function normalizeAngle(degrees) {
    // Normalize the angle to be between -180 and 180
    let normalized = degrees % 360;
    if (normalized > 180) normalized -= 360;
    if (normalized < -180) normalized += 360;
    return normalized;
  }
  
  // Calculate hand rotation based on landmarks
  function calculateHandRotation(landmarks) {
    if (!landmarks || landmarks.length < 21) return null;

    // Use the wrist (0) and middle finger MCP joint (9) to determine rotation
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];
    
    // Calculate angle in degrees, invert it, and offset by 90 degrees
    const rawAngle = (-Math.atan2(
      middleMCP.y - wrist.y,
      middleMCP.x - wrist.x
    ) * (180 / Math.PI)) - 90;
    
    return normalizeAngle(rawAngle);
  }
  
  // Optimized detection loop
  const detectGestures = () => {
    if (!video || video.readyState < 2) {
      requestAnimationFrame(detectGestures);
      return;
    }
  
    const now = performance.now();
  
    if (now - lastProcessTime < FRAME_INTERVAL) {
      requestAnimationFrame(detectGestures);
      return;
    }
  
    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
  
    const processStart = performance.now();
  
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const result = recognizer.recognizeForVideo(video, now);
  
    // Process hands
    for (let i = 0; i < NUM_HANDS; i++) {
      if (!result.landmarks[i]) {
        fingersCache[i].fingers = 0;
        fingersCache[i].stableFrames = 0;
      } else {
        countExtendedFingers(result.landmarks[i], i);
        
        // Calculate and notify hand rotation
        const rotation = calculateHandRotation(result.landmarks[i]);
        if (rotation !== null) {
          notifyHandRotation(i, rotation);
        }
      }

      // Process gestures for both hands
      if (i < result.gestures.length && result.gestures[i].length > 0) {
        const newGesture = result.gestures[i][0].categoryName;
        if (currentGestures[i] !== newGesture) {
          currentGestures[i] = newGesture;
          notifyGestureChange(i, newGesture);
        }

        if (result.landmarks[i] && result.landmarks[i][9]) {
          const landmark = result.landmarks[i][9];
          const x = landmark.x;
          const y = landmark.y;

          currentPositions[i] = { x, y };
          notifyHandMove(i, x, y);
        }
      } else {
        if (currentGestures[i] !== "None") {
          currentGestures[i] = "None";
          notifyGestureChange(i, "None");
        }
      }
    }
  
    // Handle shape selection based on total finger count
    const totalFingers = getTotalFingersUp();
    handleShapeSelection(totalFingers, result);
  
    // Notify finger count changes (using both hands)
    notifyFingerCountChange({
      hand0: fingersCache[0].fingers,
      hand1: fingersCache[1].fingers,
      total: totalFingers
    });
  
    // Handle enhanced scaling (using both hands)
    handleScaling(result);
  
    const processEnd = performance.now();
    const processingTime = processEnd - processStart;
  
    lastProcessTime = now;
    frameCount++;
  
    const nextFrameDelay = processingTime > 33 ? 50 : 16;
    setTimeout(() => requestAnimationFrame(detectGestures), nextFrameDelay);
  };
  
  // Main entrypoint
  const main = async () => {
    try {
      const overlay = document.querySelector('.overlay');
      video = await setupVideo();
  
      canvas = document.createElement("canvas");
      canvas.style.display = "none";
      ctx = canvas.getContext("2d");
      document.querySelector("main").appendChild(canvas);
  
      recognizer = await createGestureRecognizer();
  
      // Fade out the overlay
      if (overlay) {
        overlay.classList.add('hidden');
        // Remove from DOM after transition completes
        overlay.addEventListener('transitionend', () => {
          overlay.remove();
        });
      }
  
      console.log("Enhanced gesture recognition initialized");
      detectGestures();
    } catch (error) {
      console.error("Failed to initialize gesture recognition:", error);
    }
  };
  
  main();
  
  // Export functions
  export const getCurrentGesture = () => currentGestures;
  export const getCurrentPositions = () => currentPositions;
  export const getFingersCache = () => fingersCache;
  export const getTotalFingers = () => getTotalFingersUp();
  export const getHandFingers = (handIndex) => fingersCache[handIndex]?.fingers || 0;
  export const getScalingSession = () => scalingSession;
  export { resetShapeSelection, cancelShapeSelection };
  
  // Add function to switch shape mode
  function setShapeMode(mode) {
    if (mode !== currentShapeMode) {
      currentShapeMode = mode;
      // Reset selection state when switching modes
      resetShapeSelection();
      console.log(`Switched to ${mode} shape mode`);
    }
  }
  
  // Export the shape mode setter
  export const switchShapeMode = (mode) => setShapeMode(mode);
  
  // Export the angle normalization utility
  export const normalizeRotation = normalizeAngle;