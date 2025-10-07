import React, { useState, useEffect, useRef } from 'react';
import Word from './Components/Word';
import './App.css';
import axios from 'axios';
import { LoginForm, RegistrationForm, UserInfo} from './Components/AuthForms';

const MemoizedWord = React.memo(Word);
const API_BASE = "https://furiganaapi-production.up.railway.app"; //http://127.0.0.1:5000 (local) http://127.0.0.1:8080 (deploy)



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
  const [selectedLevel, setSelectedLevel] = useState(3); // Default to N5
  const [backendStatus, setBackendStatus] = useState("The back-end needs to boot up, this might take some time...");
  const [currentUser, setCurrentUser] = useState(null); // Stores username or user object
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Tracks login status
  const [authError, setAuthError] = useState(''); // For displaying login/register errors
  const [showRegister, setShowRegister] = useState(false);

  
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileName = file ? file.name : selectedBook;




   useEffect(() => {
  if (file || imageFile || selectedBook) {
    handleSubmit();
  }
  // eslint-disable-next-line
  }, [file, imageFile, selectedBook, currentPage]);


// launch a warmup call to the backend on initial render
useEffect(() => {
    axios.get(`${API_BASE}/warmup`)
        .then(response => {
            console.log("Backend warmed up:", response.data);
            setBackendStatus("Back-end connected! Get reading!");
            // You can set a status state here if you want to display a "ready" message
        })
        .catch(error => {
            console.error("Warmup failed:", error);
            setBackendStatus("Warm-up unsuccessfull, try sending a document or a picture (it might take a few seconds at first)");
        });
}, []);

// 2. Remap wordData when JLPT level changes (but only if there is data)
useEffect(() => {
  if (wordData.length > 0) {
    setWordData(prev =>
      prev.map(paragraph =>
        paragraph.map(word => defineWordDisplay(word, selectedLevel))
      )
    );
  }
  // eslint-disable-next-line
}, [selectedLevel]);

// --- NEW AUTHENTICATION HANDLERS ---

const handleLogin = async (username, password) => {
    setAuthError(''); // Clear previous error
    try {
        const response = await axios.post(`${API_BASE}/login`, { username, password }, {
            // This is crucial for Flask-Login! It ensures the session cookie is sent and received.
            withCredentials: true 
        });

        if (response.status === 200) {
            // Flask returns a 'username' on success
            setCurrentUser(response.data.username);
            setIsAuthenticated(true);
            setAuthError('');
            return true;
        }
    } catch (error) {
        const errorMsg = error.response?.data?.error || 'Login failed due to network error.';
        setAuthError(errorMsg);
        return false;
    }
};

const handleRegister = async (username, password) => {
    setAuthError('');
    try {
        const response = await axios.post(`${API_BASE}/register`, { username, password });

        if (response.status === 201) {
            setAuthError("Registration successful! Please log in.");
            return true;
        }
    } catch (error) {
        const errorMsg = error.response?.data?.error || 'Registration failed.';
        setAuthError(errorMsg);
        return false;
    }
};

const handleLogout = async () => {
    try {
        // Send request to Flask to clear the session cookie
        await axios.get(`${API_BASE}/logout`, {
            withCredentials: true // Must send credentials to clear the session
        });
        
        // Clear front-end state
        setCurrentUser(null);
        setIsAuthenticated(false);
        setAuthError('Logged out successfully.');
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

// ----- File section ------------

  const handleFileChange = (event) => {
    // Reset selected book when a file is uploaded
    setSelectedBook(null);
    setImageFile(null);
    setFile(event.target.files[0]);
    setCurrentPage(0);
    setPrefetchedData({});
  };

  const handleImageFileChange = (event) => {
    // Reset other file states
    setFile(null);
    setSelectedBook(null);

    const uploadedFile = event.target.files[0];
    setImageFile(uploadedFile);
    setCurrentPage(0);
    setPrefetchedData({});
  };

    const handleSubmit = () => {
    if (file || imageFile || selectedBook) {
      fetchAPI(currentPage, handleApiData);
    }
  };

  const handleBookSelect = (bookName) => {
    // Reset uploaded file when a pre-selected book is chosen
    setFile(null);
    setImageFile(null);
    setSelectedBook(bookName);
    setCurrentPage(0);
    setPrefetchedData({});
  };

  const handleCancel = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      setIsLoading(false);
      console.log("Request cancelled.");
    }
  };

  const handleReset = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    setWordData([]);
    setCurrentPage(0);
    setTotalLength(0);
    setFile(null);
    setImageFile(null);
    setSelectedBook(null); // Reset selected book
    setIsLoading(false);
    setPrefetchedData({});
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
      postData = formData;
    } else if (selectedBook) {
      endpoint = '/analyze';
      postData = {
        filepath: selectedBook,
        start_position: pageNumber * pageSizeCharacter,
        page_size: pageSizeCharacter,
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


//helper function to set initial word display based on selected level
function handleApiData(data) {
  const processedData = data.data.map(paragraph =>
    paragraph.map(word => defineWordDisplay(word, selectedLevel))
  );
  setWordData(processedData);
  setTotalLength(data.totalLength);
}


//Using a power for weighted average to determine kanji difficulty
function calculatePowerJlptAverage(kanjiLevels) {
    if (!kanjiLevels || kanjiLevels.length === 0) {
        return 0;
    }

    // You can adjust this exponent to change the steepness of the difficulty curve.
    const p = 2; 

    // Use .reduce() to sum the difficulty levels raised to the power of p.
    const powerSum = kanjiLevels.reduce((sum, kanji) => {
        // We use (6 - kanji.jlpt_level) to invert the scale (N5 = 1, N4 = 2, ..., N1 = 5)
        const invertedJlpt = 6 - kanji.jlpt_level;
        return sum + Math.pow(invertedJlpt, p);
    }, 0);

    // Calculate the average of the power sum
    return powerSum / kanjiLevels.length;
}



//function that determines level of each word on render


function defineWordDisplay(word, selectedLevel) {
  const kanjiLevels = word.kanji_levels;
  if (!kanjiLevels || kanjiLevels.length === 0) {
    return { ...word, showFurigana: false, showTranslation: false };
  }

  // Calculate power score (higher = harder)
  const score = calculatePowerJlptAverage(kanjiLevels);

  // User's level and "two up" level as power scores
  const userLevelScore = Math.pow(6 - selectedLevel, 2);
  const twoUpScore = Math.pow(6 - (selectedLevel - 2), 2);
  //console.log("kanji score is", score, "user level score is", userLevelScore, "two up score is", twoUpScore);
  if (score <= userLevelScore) {
    // Word is easier or equal to user's level
    return { ...word, showFurigana: false, showTranslation: false };
  } else if (score > userLevelScore && score < twoUpScore) {
    // Word is harder than user's level, but not much harder
    return { ...word, showFurigana: true, showTranslation: false };
  } else if (score >= twoUpScore) {
    // Word is much harder
    return { ...word, showFurigana: true, showTranslation: true };
  }
  return word;
}

   function handleSwipe(id) {
  setWordData(prev =>
    prev.map(paragraph =>
      paragraph.map(word => {
        if (word.id !== id) return word; // leave others untouched

        // Here you have the clicked word object
        if (word.showFurigana && word.showTranslation) {
          return { ...word, showFurigana: false, showTranslation: false };
        } else if (!word.showFurigana && word.showTranslation) {
          return { ...word, showFurigana: true };
        } else if (word.showFurigana && !word.showTranslation) {
          return { ...word, showTranslation: true };
        } else {
          return { ...word, showFurigana: true };
        }
      })
    )
  );
}




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
          kanjiDifficulty={item.kanji_levels}
          type={item.type}
          id={item.id}
          value={item.value}
        />
      ))}
    </p>
  ));

  return (
    <>
      {/* Authentication Section */}
      <div>
        {!isAuthenticated ? (
          showRegister ? (
            <RegistrationForm
              onRegister={handleRegister}
              authError={authError}
              switchToLogin={() => setShowRegister(false)}
            />
          ) : (
            <LoginForm
              onLogin={handleLogin}
              authError={authError}
              switchToRegister={() => setShowRegister(true)}
            />
          )
        ) : (
          <UserInfo currentUser={currentUser} handleLogout={handleLogout} />
        )}
      </div>

      <h1> Read2LearnKanji</h1>
      <h2> Just read, and you'll learn.</h2>
      <div > <p>{backendStatus}</p>  </div>
      
      
      
      {/* File Upload Section */}
      <div className="file-upload">
        <label htmlFor="file-input">
          <button onClick={() => fileInputRef.current && fileInputRef.current.click()}>Upload Document</button>
        </label>
        <input type="file" onChange={handleFileChange} id="file-input" ref={fileInputRef} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"/>
        
      </div>

      {/* Picture Upload Section */}
      <div className="image-upload">
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

        <p>or</p>

        {/*<p>Upload an image</p>*/}
        <button onClick={() => imageInputRef.current && imageInputRef.current.click()}>Upload Image</button>
        <input
          type="file"
          onChange={handleImageFileChange}
          id="upload-input"
          ref={imageInputRef}
          style={{ display: 'none' }}
          accept="image/*"
        />
      </div>

      <div> 
        <p className="file-name">{file ? file.name : 'No document selected'}</p>
      </div>

      {/*submit, reset and cancel buttons */}
      <div className="control-buttons">
          <button onClick={handleSubmit} disabled={!file && !imageFile && !selectedBook}>Submit</button>
          {isLoading && <button onClick={handleCancel}>Cancel</button>}
          <button onClick={handleReset}>Reset</button>
      </div>    

       Pre-selected Books Section 
      {/*<div className="pre-selected-books">
        <p>Or choose a pre-selected book:</p>
        <button onClick={() => handleBookSelect('City_and_country_side')}>city vs country-side life (~N3)</button>
        <button onClick={() => handleBookSelect('momotaro.txt')}>momotaro (easy)</button>
        <button onClick={() => handleBookSelect('Book3.txt')}>Book 3</button> 
      </div> */} 
      {/*<div className="level-select">
        <button onClick={() => {setSelectedLevel(5)}}>N5</button>
        <button onClick={() => {setSelectedLevel(4)}}>N4</button>
        <button onClick={() => {setSelectedLevel(3)}}>N3</button>
        <button onClick={() => {setSelectedLevel(2)}}>N2</button>
        <button onClick={() => {setSelectedLevel(1)}}>N1</button>
      </div>*/} 

      
      <div> 
        <p className="userInformation">Click on words to toggle furigana and translations!</p>
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
      
      <div > <p className="userInformation">~This is only a proof of concept~</p> 
      <p className="userInformation" > if you are curious about the final output, visit the Concordia booth! ;)</p>
      </div>
    </>
  );
}
export default App;