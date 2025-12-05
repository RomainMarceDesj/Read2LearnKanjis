import React, { useState, useEffect, useRef } from 'react';
import Word from './Components/Word';
import './App.css';
import axios from 'axios';

const MemoizedWord = React.memo(Word);
const API_BASE = "http://127.0.0.1:5000"; // http://127.0.0.1:5000 (local) https://furiganaapi-production.up.railway.app
const APP_VERSION = "V0App";  // ✅ Version identifier for App.jsx



function App() {
  const [wordData, setWordData] = useState([]);
  const [pageSizeCharacter, setPageSizeCharacter] = useState(1000);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalLength, setTotalLength] = useState(0);
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const controllerRef = useRef(null);
  const [prefetchedData, setPrefetchedData] = useState({});
  const [selectedBook, setSelectedBook] = useState(null); // New state for pre-selected books
  const [imageFile, setImageFile] = useState(null);
  const [backendStatus, setBackendStatus] = useState("The back-end needs to boot up, this might take some time...");
  const [currentUser, setCurrentUser] = useState(null); // Stores username or user object
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Tracks login status
  const [authError, setAuthError] = useState(''); // For displaying login/register errors
  const [showRegister, setShowRegister] = useState(false);
    const [sessionId, setSessionId] = useState(null);
  const [pageStartTime, setPageStartTime] = useState(Date.now());
  const [wordsClickedThisPage, setWordsClickedThisPage] = useState(0);
  const [wordInteractionTracker, setWordInteractionTracker] = useState({});
  const [lastClickTime, setLastClickTime] = useState(null);
  const [clickIntervals, setClickIntervals] = useState([]);
  const [totalClicksInSession, setTotalClicksInSession] = useState(0);
  const [totalClicksAny, setTotalClicksAny] = useState(0);
  
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileName = file ? file.name : selectedBook;



  useEffect(() => {
    if (isAuthenticated && currentUser && !sessionId) {
      startSession();
    }
  }, [isAuthenticated, currentUser]);


    useEffect(() => {
    return () => {
      if (sessionId) {
        endSession();
      }
    };
  }, [sessionId]);

   useEffect(() => {
  if (file || imageFile || selectedBook) {
    handleSubmit();
  }
  // eslint-disable-next-line
  }, [file, imageFile, selectedBook, currentPage]);


  useEffect(() => {
    setClickIntervals([]);
    setLastClickTime(null);
  }, [currentPage]);


  useEffect(() => {
    if (!sessionId || wordData.length === 0) return;
    
    const heartbeatInterval = setInterval(() => {
      // ✅ Count ALL words on page (kanji and non-kanji)
      const allWords = wordData.flat().filter(w => w.type === "word");
      const totalWordsOnPage = allWords.length;
      
      // ✅ Count only kanji words separately
      const kanjiWordsOnPage = allWords.filter(w => w.kanji).length;
      
      // ✅ Count unique words clicked (not total clicks)
      const uniqueWordsClicked = Object.keys(wordInteractionTracker).length;
      
      // ✅ Count kanji words that were clicked
      const kanjiWordsClicked = Object.keys(wordInteractionTracker).filter(wordId => {
        const word = allWords.find(w => w.id === parseInt(wordId));
        return word && word.kanji;
      }).length;
      
      // Calculate click interval stats
      const avgInterval = clickIntervals.length > 0 
        ? clickIntervals.reduce((a, b) => a + b, 0) / clickIntervals.length 
        : 0;
      const minInterval = clickIntervals.length > 0 
        ? Math.min(...clickIntervals) 
        : 0;
      
      axios.post(`${API_BASE}/heartbeat`, {
        user_id: currentUser,
        session_id: sessionId,
        app_version: APP_VERSION,
        page_number: currentPage,
        document_name: fileName,
        
        // Current page stats
        time_on_page_seconds: Math.round((Date.now() - pageStartTime) / 1000),
        words_on_page: totalWordsOnPage, // ✅ ALL words (kanji + non-kanji)
        kanji_words_on_page: kanjiWordsOnPage, // ✅ Only kanji words
        words_clicked_on_page: uniqueWordsClicked, // ✅ Unique words clicked (any type)
        kanji_words_clicked_on_page: kanjiWordsClicked, // ✅ Only kanji words clicked
        total_clicks_any: totalClicksAny, // ✅ NEW: Total clicks including re-clicks
        
        // Session-wide stats
        average_click_interval_seconds: Math.round(avgInterval * 10) / 10,
        minimum_click_interval_seconds: Math.round(minInterval * 10) / 10,
        
        timestamp: new Date().toISOString()
      }).catch(err => console.error("Heartbeat failed:", err));
      
      console.log(`💓 Heartbeat: Words=${totalWordsOnPage}, Kanji=${kanjiWordsOnPage}, Clicked=${uniqueWordsClicked}, Total Clicks=${totalClicksAny}`);
    }, 5000);
    
    return () => clearInterval(heartbeatInterval);
  }, [sessionId, wordData, pageStartTime, wordsClickedThisPage, currentPage, fileName, clickIntervals, wordInteractionTracker, totalClicksAny]);


  const startSession = async () => {
    try {
      const response = await axios.post(`${API_BASE}/start_session`, {
        user_id: currentUser,
        app_version: APP_VERSION  // ✅ NEW: Send version info
      });
      
      const newSessionId = response.data.session_id;
      setSessionId(newSessionId);
      console.log(`✅ Session started: ${newSessionId} (Version: ${APP_VERSION})`);
    } catch (error) {
      console.error("Failed to start session:", error);
    }
  };

// launch a warmup call to the backend on initial render
// --- App.jsx (Replace the useEffect that starts around line 53) ---

// Define the comprehensive health check function
const checkBackendHealth = async () => {
    // 🔑 IMPORTANT: Call the /health endpoint, not /warmup
    const healthUrl = `${API_BASE}/health`; 
    console.log(`Starting comprehensive health check at: ${healthUrl}`);

    try {
        const response = await axios.get(healthUrl);
        const statusData = response.data; 
        
        // 1. Check overall server status (Backend Warmup)
        if (response.status === 200 && statusData.status === "healthy") {
            console.log("✅ BACKEND WARMUP SUCCESSFUL: Server is running and responding.");
            setBackendStatus("Back-end connected! Get reading!");
        } else {
            console.error(`❌ BACKEND WARMUP FAILED: Server responded with status ${response.status}.`, statusData);
            setBackendStatus("Warm-up unsuccessfull. Check console for details.");
        }

        // 2. Check individual database connection (MongoDB)
        const userDbStatus = statusData.checks.user_db;

        if (userDbStatus && userDbStatus.startsWith("OK")) {
            console.log("✅ DATABASE CONNECTION SUCCESSFUL: MongoDB (user_db) is accessible.");
        } else {
            // Log the error message from the backend's response
            console.error(`❌ DATABASE CONNECTION FAILED: MongoDB (user_db) reported: ${userDbStatus}`);
        }
        
    } catch (error) {
        // Handle critical network/CORS/unreachable server errors
        const errorMsg = error.response?.data?.error || error.message;
        console.error("❌ CRITICAL WARMUP FAILURE: The backend service is unreachable or network error occurred.", errorMsg);
        setBackendStatus("Connection error. The back-end may be down.");
    }
};

// launch a comprehensive health check on initial render
useEffect(() => {
    // 🔑 Run the new check function on component mount
    checkBackendHealth();
    checkPersistedLogin(); 
  }, []); // Empty dependency array ensures it runs only once on mount

// --- End Replacement ---



//sending final show val data when navigating away from page



// ✅ Always send most recent wordData when leaving page, changing page, or resetting
useEffect(() => {
  // Handle browser tab close / page refresh
  const handleBeforeUnload = () => {
    if (sessionId) {
      // ✅ ONLY end session, heartbeat system handles the rest
      const sessionPayload = JSON.stringify({
        user_id: currentUser,
        session_id: sessionId
      });
      navigator.sendBeacon(`${API_BASE}/end_session`, new Blob([sessionPayload], { type: "application/json" }));
    }
  };
  
  window.addEventListener("beforeunload", handleBeforeUnload);
  
  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    if (sessionId) {
      endSession();
    }
  };
}, [sessionId]);



// ==================== Used ID section ==========================

const handleUserIdCheck = async (userId) => {
  setAuthError('');
  try {
    const response = await axios.post(`${API_BASE}/verify_user`, { user_id: userId });
    if (response.status === 200) {
      setCurrentUser(response.data.userId);
      setIsAuthenticated(true);
      setAuthError('');
      localStorage.setItem('currentUserId', userId);
      return true;
    }
  } catch (error) {
    const errorMsg = error.response?.data?.error || 'Invalid User ID.';
    setAuthError(errorMsg);
    setIsAuthenticated(false);
    return false;
  }
};


// stay loggedIn

const checkPersistedLogin = () => {
    // Retrieve the user ID from the browser's local storage
    const persistedUserId = localStorage.getItem('currentUserId'); 
    
    if (persistedUserId) {
        // If a stored ID is found, restore the session state
        setCurrentUser(persistedUserId);
        setIsAuthenticated(true);
        console.log(`User ${persistedUserId} found in local storage. Session restored.`);
        
        // Note: You should ideally call the /verify_user endpoint here 
        // to re-fetch the user's latest kanji proficiency data on load.
    }
};

// Loggout section 

 const handleLogout = () => {
    // End session before logging out
    if (sessionId) {
      endSession();
    }
    
    // Clear persistent storage
    localStorage.removeItem('currentUserId');
    
    // Reset state
    setCurrentUser(null);
    setIsAuthenticated(false);
    setSessionId(null);
    setWordData([]);
    setTotalLength(0);
    setPrefetchedData({});
    
    console.log("User logged out successfully.");
  };

const endSession = async () => {
    if (!sessionId) return;
    
    try {
      // Use sendBeacon for reliable delivery on page close
      const payload = JSON.stringify({
        user_id: currentUser,
        session_id: sessionId
      });
      
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(`${API_BASE}/end_session`, blob);
      
      console.log(`✅ Session ended: ${sessionId}`);
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  };


//=====================================TRACKING SECTION======================

// Add this useEffect



function handleSwipe(id) {
  setWordData(prev =>
    prev.map(paragraph =>
      paragraph.map(word => {
        if (word.id !== id) return word;

        // ✅ ADD THIS: Track the click
        trackWordClick(id, {
          showFurigana: word.showFurigana,
          showTranslation: word.showTranslation
        });

        // Existing logic for state transitions
        let newState;
        if (word.showFurigana && word.showTranslation) {
          newState = { ...word, showFurigana: false, showTranslation: false };
        } else if (!word.showFurigana && word.showTranslation) {
          newState = { ...word, showFurigana: true };
        } else if (word.showFurigana && !word.showTranslation) {
          newState = { ...word, showTranslation: true };
        } else {
          newState = { ...word, showFurigana: true };
        }

        // ✅ ADD THIS: Log complete interaction when user hides everything
        if (!newState.showFurigana && !newState.showTranslation && sessionId) {
          logWordInteraction(id, word.kanji || word.value, newState);
        }

        return newState;
      })
    )
  );
}

// ✅ ADD THESE NEW FUNCTIONS:
  const trackWordClick = (wordId, currentState) => {
    console.log("📍 trackWordClick START", { wordId, currentState });
    
    const now = Date.now();
    
    // ✅ DEDUPLICATION: Check if this is a duplicate call within 100ms
    const tracker = wordInteractionTracker[wordId];
    if (tracker?.clickSequence?.length > 0) {
      const lastClick = tracker.clickSequence[tracker.clickSequence.length - 1];
      const lastTime = new Date(lastClick.timestamp).getTime();
      const timeDiff = now - lastTime;
      
      if (timeDiff < 100) {
        console.log(`⚠️ DUPLICATE CLICK detected (${timeDiff}ms ago), IGNORING`);
        return; // ← Exit early, don't track
      }
    }
    
    // Track click intervals
    if (lastClickTime !== null) {
      const interval = (now - lastClickTime) / 1000;
      setClickIntervals(prev => [...prev, interval]);
    }
    setLastClickTime(now);
    
    // Increment ALL click counters
    console.log("📍 Current totalClicksAny:", totalClicksAny);
    setTotalClicksAny(prev => {
      console.log("📍 Incrementing totalClicksAny from", prev, "to", prev + 1);
      return prev + 1;
    });
    
    // Only increment "words clicked this page" once per word
    if (!wordInteractionTracker[wordId]) {
      console.log("📍 First click on this word, incrementing wordsClickedThisPage");
      setWordsClickedThisPage(prev => prev + 1);
    }
    
    // Initialize tracking for this word if needed
    if (!wordInteractionTracker[wordId]) {
      console.log("📍 Initializing tracker for word", wordId);
      setWordInteractionTracker(prev => ({
        ...prev,
        [wordId]: {
          initialState: { ...currentState },
          clickSequence: [],
          startTime: now
        }
      }));
    }
    
    // Add click to sequence
    const action = determineAction(currentState);
    console.log("📍 Adding action to sequence:", action);
    
    setWordInteractionTracker(prev => ({
      ...prev,
      [wordId]: {
        ...prev[wordId],
        clickSequence: [
          ...prev[wordId].clickSequence,
          {
            action: action,
            timestamp: new Date().toISOString()
          }
        ]
      }
    }));
    
    console.log("📍 trackWordClick END");
  };


const determineAction = (state) => {
  if (state.showFurigana && state.showTranslation) {
    return "hide_all";
  } else if (!state.showFurigana && state.showTranslation) {
    return "show_furigana";
  } else if (state.showFurigana && !state.showTranslation) {
    return "show_translation";
  } else {
    return "show_furigana";
  }
};

  const logWordInteraction = async (wordId, word, finalState) => {
    const tracker = wordInteractionTracker[wordId];
    if (!tracker) return;
    
    const timeSpent = Date.now() - tracker.startTime;
    
    // ✅ Determine the HIGHEST level of help the user accessed
    let maxHelpLevel = "nothing";
    
    // Check all clicks in sequence
    for (const click of tracker.clickSequence) {
      if (click.action === "show_translation") {
        maxHelpLevel = "translation"; // Highest level
        break;
      } else if (click.action === "show_furigana" && maxHelpLevel === "nothing") {
        maxHelpLevel = "furigana";
      }
    }
    
    // ✅ IMPORTANT: If sequence is empty, check initial state
    if (tracker.clickSequence.length === 0) {
      if (tracker.initialState.showFurigana && tracker.initialState.showTranslation) {
        maxHelpLevel = "translation";
      } else if (tracker.initialState.showFurigana) {
        maxHelpLevel = "furigana";
      }
    }
    
    console.log(`🔍 Word: ${word}, Clicks: ${tracker.clickSequence.length}, Max Help: ${maxHelpLevel}`);
    
    try {
      await axios.post(`${API_BASE}/log_word_interaction`, {
        user_id: currentUser,
        session_id: sessionId,
        word: word,
        initial_state: tracker.initialState,
        final_state: finalState,
        max_help_level: maxHelpLevel, // ✅ This is critical
        click_sequence: tracker.clickSequence,
        time_spent_ms: timeSpent,
        num_clicks: tracker.clickSequence.length
      });
      
      console.log(`📝 Word interaction logged: ${word} (max help: ${maxHelpLevel})`);
      
      // Clear tracker for this word
      setWordInteractionTracker(prev => {
        const newTracker = { ...prev };
        delete newTracker[wordId];
        return newTracker;
      });
      
    } catch (error) {
      console.error("Failed to log word interaction:", error);
    }
  };




// ----- File section ------------

  const handleFileChange = (event) => {
    // Send final heartbeat if there's active data
    if (sessionId && wordData.length > 0) {
      const totalWordsOnPage = wordData.flat().filter(w => w.type === "word").length;
      axios.post(`${API_BASE}/heartbeat`, {
        user_id: currentUser,
        session_id: sessionId,
        page_number: currentPage,
        document_name: fileName,
        time_on_page_seconds: Math.round((Date.now() - pageStartTime) / 1000),
        words_on_page: totalWordsOnPage,
        words_clicked_on_page: wordsClickedThisPage,
        total_clicks_in_session: totalClicksInSession,
        average_click_interval_seconds: clickIntervals.length > 0 ? Math.round((clickIntervals.reduce((a,b) => a+b, 0) / clickIntervals.length) * 10) / 10 : 0,
        minimum_click_interval_seconds: clickIntervals.length > 0 ? Math.round(Math.min(...clickIntervals) * 10) / 10 : 0,
        timestamp: new Date().toISOString()
      }).catch(err => console.error("Failed to send final heartbeat:", err));
    }
  
  // Reset selected book when a file is uploaded
  setSelectedBook(null);
  setImageFile(null);
  setFile(event.target.files[0]);
  setCurrentPage(0);
  setPrefetchedData({});
  
  // ✅ ADD THESE RESETS:
  setWordsClickedThisPage(0);
  setClickIntervals([]);
  setLastClickTime(null);
  setPageStartTime(Date.now());
  setWordInteractionTracker({});
  setTotalClicksAny(0);
  };

  const handleImageFileChange = (event) => {
    // First, log the current page if there's active data
    if (sessionId && wordData.length > 0) {
      // Send final heartbeat immediately before switching
      const totalWordsOnPage = wordData.flat().filter(w => w.type === "word").length;
      axios.post(`${API_BASE}/heartbeat`, {
        user_id: currentUser,
        session_id: sessionId,
        page_number: currentPage,
        document_name: fileName,
        time_on_page_seconds: Math.round((Date.now() - pageStartTime) / 1000),
        words_on_page: totalWordsOnPage,
        words_clicked_on_page: wordsClickedThisPage,
        total_clicks_in_session: totalClicksInSession,
        average_click_interval_seconds: clickIntervals.length > 0 ? Math.round((clickIntervals.reduce((a,b) => a+b, 0) / clickIntervals.length) * 10) / 10 : 0,
        minimum_click_interval_seconds: clickIntervals.length > 0 ? Math.round(Math.min(...clickIntervals) * 10) / 10 : 0,
        timestamp: new Date().toISOString()
      }).catch(err => console.error("Failed to send final heartbeat:", err));
    }
    
    // Reset other file states
    setFile(null);
    setSelectedBook(null);

    const uploadedFile = event.target.files[0];
    setImageFile(uploadedFile);
    setCurrentPage(0);
    setPrefetchedData({});
    
    // ✅ ADD THESE RESETS:
    setWordsClickedThisPage(0);
    setClickIntervals([]);
    setLastClickTime(null);
    setPageStartTime(Date.now());
    setWordInteractionTracker({});
    setTotalClicksAny(0);
  };

    const handleSubmit = () => {
    if (file || imageFile || selectedBook) {
      fetchAPI(currentPage, handleApiData);
    }
  };

  {/*const handleBookSelect = (bookName) => {
    // Reset uploaded file when a pre-selected book is chosen
    setFile(null);
    setImageFile(null);
    setSelectedBook(bookName);
    setCurrentPage(0);
    setPrefetchedData({});
  };*/}

  const handleCancel = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      setIsLoading(false);
      console.log("Request cancelled.");
    }
  };

  const handleReset = () => {
    // Send final heartbeat if there's active data
    if (sessionId && wordData.length > 0) {
      const totalWordsOnPage = wordData.flat().filter(w => w.type === "word").length;
      axios.post(`${API_BASE}/heartbeat`, {
        user_id: currentUser,
        session_id: sessionId,
        page_number: currentPage,
        document_name: fileName,
        time_on_page_seconds: Math.round((Date.now() - pageStartTime) / 1000),
        words_on_page: totalWordsOnPage,
        words_clicked_on_page: wordsClickedThisPage,
        total_clicks_in_session: totalClicksInSession,
        average_click_interval_seconds: clickIntervals.length > 0 ? Math.round((clickIntervals.reduce((a,b) => a+b, 0) / clickIntervals.length) * 10) / 10 : 0,
        minimum_click_interval_seconds: clickIntervals.length > 0 ? Math.round(Math.min(...clickIntervals) * 10) / 10 : 0,
        timestamp: new Date().toISOString()
      }).catch(err => console.error("Failed to send final heartbeat:", err));
    }
    
    // Send proficiency updates (existing logic)
    sendUpdateData(wordData);

    // Reset file inputs
    if (controllerRef.current) {controllerRef.current.abort();}
    if (fileInputRef.current) {fileInputRef.current.value = "";}
    if (imageInputRef.current) {imageInputRef.current.value = "";}
    
    // Reset document state
    setWordData([]);
    setCurrentPage(0);
    setTotalLength(0);
    setFile(null);
    setImageFile(null);
    setSelectedBook(null);
    setIsLoading(false);
    setPrefetchedData({});
    
    // ✅ MAKE SURE ALL ANALYTICS STATE IS RESET:
    setWordsClickedThisPage(0);
    setWordInteractionTracker({});
    setClickIntervals([]);
    setLastClickTime(null);
    setTotalClicksInSession(0);
    setPageStartTime(Date.now());
    setTotalClicksAny(0);
  };

  async function fetchAPI(pageNumber, onSuccess) {
  setIsLoading(true);
  controllerRef.current = new AbortController();
  const signal = controllerRef.current.signal;

  try {
    let formData = new FormData();
    let endpoint = '';
    let postData;
    let config = { signal: signal }; // default config

    console.log("Uploading image file:", imageFile);
    console.log("Image file name:", imageFile?.name);
    console.log("Image file type:", imageFile?.type);

    if (imageFile) {
      endpoint = '/ocr';
      // Ensure we're appending the actual file with the correct field name
      formData.append('image_file', imageFile, imageFile.name);
      formData.append('start_position', pageNumber * pageSizeCharacter);
      formData.append('page_size', pageSizeCharacter);
      formData.append("user_id", currentUser);
      postData = formData;
      
      // Debug: Log FormData contents
      for (let pair of formData.entries()) {
        console.log('FormData:', pair[0], pair[1]);
      }
    } else if (file) {
      endpoint = '/analyze';
      formData.append('file', file);
      formData.append('start_position', pageNumber * pageSizeCharacter);
      formData.append('page_size', pageSizeCharacter);
      formData.append("user_id", currentUser);
      postData = formData;
    } else if (selectedBook) {
      endpoint = '/analyze';
      postData = {
        filepath: selectedBook,
        start_position: pageNumber * pageSizeCharacter,
        page_size: pageSizeCharacter,
        user_id: currentUser
      };
      config.headers = { "Content-Type": "application/json" }; // 🔑 send JSON properly
    } else {
      setIsLoading(false);
      return;
    }

    const response = await axios.post(`${API_BASE}${endpoint}`, postData, config);

    onSuccess(response.data);
    console.log("API response:", response.data);
    setIsLoading(false);
    setBackendStatus("Back-end connected!");
  } catch (error) {
    if (axios.isCancel(error)) {
      console.log('Request aborted by user');
    } else {
      console.error("There was an error!", error);
      console.error("Error response:", error.response);
      console.error("Error status:", error.response?.status);
      console.error("Error data:", error.response?.data);
      
      if (error.response?.status === 400) {
        setBackendStatus(`Bad request: ${error.response.data?.error || 'Unknown error'}`);
      } else {
        setBackendStatus("Connection error. The back-end may be down.");
      }
    }
    setIsLoading(false);
  }
}

//=================== Helper functions related to furigana display =========================


//helper function to set initial word display based on selected level
function handleApiData(data) {
  const processedData = data.data.map(paragraph =>
    paragraph.map(word => defineWordDisplayByDifficulty(word))
  );
  setWordData(processedData);
  setTotalLength(data.totalLength);
}


// ==================== Word display logic based on difficulty score =========================

function defineWordDisplayByDifficulty(word) {
  const score = word.readPropScore ?? 0; // fallback for safety
 console.log(`Word: ${word.kanji || word.value}, Score: ${score}`);
  // These thresholds can be tuned later
  if (score >= -0.3) {
    // Easy → Hide everything
    return { ...word, showFurigana: false, showTranslation: false };
  } else if (score >= -0.5) {
    // Medium → Show only furigana
    return { ...word, showFurigana: true, showTranslation: false };
  } else {
    // Hard → Show both furigana and translation
    return { ...word, showFurigana: true, showTranslation: true };
  }
}


//---- ShowVal state sending section -----

// Helper to map current word display state to the backend's final_show_val (0, 1, or 2)
  const getFinalShowVal = (word) => {
    if (word.showFurigana && word.showTranslation) {
      return 2; // HARD: Translation was shown
    } else if (word.showFurigana) {
      return 1; // MEDIUM: Furigana was shown
    } else {
      return 0; // EASY: Nothing was shown
    }
  };
  
  // Function to send the final state of all words on a page to the API
  const sendUpdateData = (dataToSend, useBeacon = false) => {
      console.log("sendUpdateData called", {
        isAuthenticated,
        currentUser,
        dataLength: dataToSend.length
      });
      if (!isAuthenticated || !currentUser || dataToSend.length === 0) return;

    const wordsToUpdate = dataToSend.flat().filter(word => word.kanji);
    console.log("wordsToUpdate:", wordsToUpdate.map(w => w.kanji || w.value));
    if (wordsToUpdate.length === 0) return;

    if (useBeacon) {
      // ✅ Fallback-safe synchronous sending for tab close
      wordsToUpdate.forEach(word => {
        const finalShowVal = getFinalShowVal(word);
        const token = word.kanji || word.value;
        if (!token) return;
        const payload = {
          user_id: currentUser,
          token: token,
          final_show_val: finalShowVal,
          timestamp: new Date().toISOString(),  // ✅ NEW: Add timestamp
          was_clicked: finalShowVal > 0  // ✅ NEW: Track if it was clicked
        };
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json"
        });
        navigator.sendBeacon(`${API_BASE}/update_scan_data`, blob);
      });
      return;
    }

    // Normal async sending (navigation/reset)
    const updates = wordsToUpdate.map(word => {
      const finalShowVal = getFinalShowVal(word);
      const token = word.kanji || word.value;
      if (!token) return Promise.resolve();
      const payload = {
        user_id: currentUser,
        token: token,
        final_show_val: finalShowVal,
        timestamp: new Date().toISOString(),  // ✅ NEW: Add timestamp
        was_clicked: finalShowVal > 0  // ✅ NEW: Track if it was clicked
      };
      console.log("Payload:", payload);
      return axios
        .post(`${API_BASE}/update_scan_data`, payload)
        .catch(err =>
          console.error(
            `Failed to update score for ${token}:`,
            err.response?.data || err.message
          )
        );
    });

    Promise.allSettled(updates).then(results => {
      const failed = results.filter(r => r.status === "rejected").length;
      console.log(
        failed === 0
          ? `Successfully sent ${wordsToUpdate.length} updates.`
          : `${failed} updates failed.`
      );
    });
  };






  const handleNextPage = () => {
    if ((currentPage + 1) * pageSizeCharacter < totalLength) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  };

  const handlePrevPage = () => {
    setCurrentPage(prevPage => Math.max(0, prevPage - 1));
  };

// Generate paragraph elements
  const paragraphElement = wordData.map((show, i) => (
    <p key={i}>
      {show.map((item, j) => (
        <MemoizedWord
          key={item.id ?? `text-${i}-${j}`}
          handleSwipe={handleSwipe}
          furigana={item.furigana}
          translation={item.translation}
          kanji={item.kanji}
          showFurigana={item.showFurigana}
          showTranslation={item.showTranslation}
          type={item.type}
          id={item.id}
          value={item.value}
        />
      ))}
    </p>
  ));

  return (
    <div className="app-container">
      {/* Authentication Section */}
      <div className="auth-section" style={{ marginBottom: '1rem' }}>
        {!isAuthenticated ? (
          <>
            <p>Enter your User ID:</p>
            <input
              type="text"
              placeholder="e.g. user123"
              onChange={(e) => setCurrentUser(e.target.value)}
              style={{ padding: '0.4rem', marginRight: '0.5rem' }}
            />
            <button onClick={() => handleUserIdCheck(currentUser)}>Enter</button>
            {authError && <p style={{ color: 'red' }}>{authError}</p>}
          </>
        ) : (
          <p>Welcome back, <strong>{currentUser}</strong>!</p>
        )}
      </div>

      {isAuthenticated && currentUser && (
        <>
          <h1> Read2LearnKanji</h1>
          <h2> Just read, and you'll learn.</h2>
      <div > <p>{backendStatus}</p>  </div>
      
      
      
      {/* File Upload Section */}
      <div className="image-upload">

        <div >
            <label htmlFor="file-input">
              <button onClick={() => fileInputRef.current && fileInputRef.current.click()}>Upload Document</button>
            </label>
            <input type="file" onChange={handleFileChange} id="file-input" ref={fileInputRef} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"/>
          </div>
        {/*<p>Upload an image</p>*/}
        <button onClick={() => imageInputRef.current && imageInputRef.current.click()}>Upload local Image</button>
        <input
          type="file"
          onChange={handleImageFileChange}
          id="upload-input"
          ref={imageInputRef}
          style={{ display: 'none' }}
          accept="image/*"
        />
      </div>
          

      {/* Picture Upload Section */}
      <div className="take-picture">
        {/*<p>Take a picture</p>*/}
        <button onClick={() => cameraInputRef.current && cameraInputRef.current.click()}>Take picture</button>
        <input
          type="file"
          onChange={handleImageFileChange}
          id="camera-input"
          ref={cameraInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          capture="environment"
        />
      </div>

      <div> 
        <p className="file-name">{file ? file.name : 'No document selected'}</p>
      </div>

      {/*submit, reset and cancel buttons */}
      <div className="control-buttons">
          {/*<button onClick={handleSubmit} disabled={!file && !imageFile && !selectedBook}>Submit</button>*/}
          {isLoading && <button onClick={handleCancel}>Cancel</button>}
          <button onClick={handleReset}>Reset</button>
      </div>    

      {/* Pre-selected Books Section */}
      {/*<div className="pre-selected-books">
        <p>Or choose a pre-selected book:</p>
        <button onClick={() => handleBookSelect('City_and_country_side')}>city vs country-side life (~N3)</button>
        <button onClick={() => handleBookSelect('momotaro.txt')}>momotaro (easy)</button>
        <button onClick={() => handleBookSelect('Book3.txt')}>Book 3</button> 
      </div> */}
      
      <div> 
        <p className="userInformation">Instructions :</p>
        <p className="userInformation"> The objective of this is to help you read anything in Japanese.</p>
        <p className="userInformation"> If you cannot read a word, click it to toggle furigana and translations to match your level</p>
        {/*<p className="userInformation">try to change the JLPT difficulty level as well!</p>*/}
      </div>
      <div className="main_text" style={{ lineHeight: 1.8 }}>
        {isLoading && !prefetchedData[`page_${currentPage}`] ? (
          <p>Loading...</p>
        ) : (
          <>
            {paragraphElement}
          </>
        )}
      </div>
      {/* navigation buttons */}
      <div className="page-navigation">
        <button onClick={handlePrevPage} disabled={currentPage === 0}>Previous Page</button>
        <span>Page {currentPage + 1}</span>
        <button onClick={handleNextPage} disabled={(currentPage + 1) * pageSizeCharacter >= totalLength}>Next Page</button>
      </div>
      <div>
        <button onClick={handleLogout}>
        Logout ({currentUser})
        </button>

      </div>
        </>
      )}
    </div>
  );
}
export default App;