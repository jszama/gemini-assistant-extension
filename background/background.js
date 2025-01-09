const GEMINI_API_KEY = '';

function sendToGemini(selectedText, prompt) {
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "contents": [{
                "parts": [{"text": selectedText + "\n" + prompt}]
            }],
        })
    }).then(response => {
        if (!response.ok) {
            throw new Error('Failed to generate response');
        }
        return response.json();
    })
}

async function sendScreenshotToGemini(dataUrl, prompt) {
    const base64Data = dataUrl.split(',')[1]; 

    const payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt,
                    },
                    {
                        "inline_data": {
                            "data": base64Data,
                            "mime_type": "image/jpeg",
                        }
                    }
                ]
            }
        ]
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Failed to generate response');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}
  
chrome.contextMenus.create({
        id: "generate-response",
        title: "Generate response with Gemini",
        contexts: ["selection"]
    }
);

chrome.contextMenus.create({
        id: "generate-response-screenshot",
        title: "Generate response with Gemini (Screenshot)"
    }
);

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "generate-response") {
        const selectedText = info.selectionText;
    
        // Ask for the prompt 
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (selectedText) => {

                // Dark Overlay
                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100vw';
                overlay.style.height = '100vh';
                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                overlay.style.zIndex = '10000';
                overlay.style.display = 'flex';
                overlay.style.justifyContent = 'center';
                overlay.style.alignItems = 'center';

                // Prompt Form
                const modal = document.createElement('div');
                modal.style.backgroundColor = 'white';
                modal.style.padding = '20px';
                modal.style.borderRadius = '10px';
                modal.style.width = '400px';
                modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                modal.style.fontFamily = 'Arial, sans-serif';
                modal.style.color = '#333';

                modal.innerHTML = `
                    <h2>Generate response with Gemini</h2>
                    <p>${selectedText}</p>
                    <h3>Enter your prompt</h3>
                    <textarea id="user-prompt" rows="4" style="width: 100%;"></textarea>
                    <br>
                    <button id="submit-prompt" style="margin-top: 10px; padding: 5px 10px; border: none; background-color: #333; color: white; border-radius: 5px; cursor: pointer;">Submit</button>
                    <button id="cancel-prompt" style="margin-top: 10px; padding: 5px 10px; border: none; background-color: #999; color: white; border-radius: 5px; cursor: pointer; margin-left: 10px;">Cancel</button>
                `;

                overlay.appendChild(modal);
                document.body.appendChild(overlay);

                // Extract the user's prompt or cancel the prompt
                return new Promise((resolve, reject) => {
                    document.getElementById('submit-prompt').addEventListener('click', () => {
                        const userPrompt = document.getElementById('user-prompt').value;
                        overlay.remove();
                        resolve(userPrompt);
                    });

                    document.getElementById('cancel-prompt').addEventListener('click', () => {
                        overlay.remove();
                        reject(null);
                    });
                });
            }
        }, (results) => {
            // Get the user's prompt
            if (results && results[0] && results[0].result) {
                const userPrompt = results[0].result;
    
                sendToGemini(selectedText, userPrompt)
                    .then(data => {
                        const responseText = data.candidates[0].content.parts[0].text;
    
                        // Display the response
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: (selectedText, userPrompt, responseText) => {
                                if (document.getElementById('custom-modal')) {
                                    return;
                                }
                        
                                // Dark Overlay
                                const overlay = document.createElement('div');
                                overlay.id = 'custom-modal';
                                overlay.style.position = 'fixed';
                                overlay.style.top = '0';
                                overlay.style.left = '0';
                                overlay.style.width = '100vw';
                                overlay.style.height = '100vh';
                                overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                                overlay.style.zIndex = '10000';
                                overlay.style.display = 'flex';
                                overlay.style.justifyContent = 'center';
                                overlay.style.alignItems = 'center';
                        
                                // Response Content
                                const modal = document.createElement('div');
                                modal.style.backgroundColor = 'white';
                                modal.style.padding = '20px';
                                modal.style.borderRadius = '10px';
                                modal.style.width = '400px';
                                modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                                modal.style.fontFamily = 'Arial, sans-serif';
                                modal.style.color = '#333';
                        
                                modal.innerHTML = `
                                    <h3>Response</h3>
                                    <p><strong>Selected Text:</strong> ${selectedText}</p>
                                    <p><strong>Prompt:</strong> ${userPrompt}</p>
                                    <p><strong>Response:</strong> ${responseText}</p>
                                `;
                        
                                // Close Window Button
                                const closeButton = document.createElement('button');
                                closeButton.textContent = 'Close';
                                closeButton.style.marginTop = '10px';
                                closeButton.style.padding = '5px 10px';
                                closeButton.style.border = 'none';
                                closeButton.style.backgroundColor = '#333';
                                closeButton.style.color = 'white';
                                closeButton.style.borderRadius = '5px';
                                closeButton.style.cursor = 'pointer';
                                closeButton.addEventListener('click', () => {
                                    overlay.remove();
                                });
                                modal.appendChild(closeButton);
                        
                                overlay.appendChild(modal);
                                document.body.appendChild(overlay);
                            },
                            args: [selectedText, userPrompt, responseText]
                        });                                        
                    })
                    .catch(err => {
                        console.error("Error sending data to Gemini:", err);
                    });
            } else {
                // User cancelled the prompt or no input was provided
                console.error("No valid prompt received. User might have cancelled the prompt.");
            }
        });
    }    
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "generate-response-screenshot") {
        // Allow user to select area to screenshot
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                return new Promise((resolve) => {
                    const overlay = document.createElement('div');
                    overlay.style.position = 'fixed';
                    overlay.style.top = '0';
                    overlay.style.left = '0';
                    overlay.style.width = '100vw';
                    overlay.style.height = '100vh';
                    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    overlay.style.zIndex = '10000';
                    overlay.style.cursor = 'crosshair';
                    document.body.appendChild(overlay);

                    const selectionBox = document.createElement('div');
                    selectionBox.style.position = 'absolute';
                    selectionBox.style.border = '2px dashed #fff';
                    overlay.appendChild(selectionBox);

                    let startX, startY, endX, endY;

                    const onMouseMove = (e) => {
                        endX = e.clientX;
                        endY = e.clientY;
                        selectionBox.style.left = `${Math.min(startX, endX)}px`;
                        selectionBox.style.top = `${Math.min(startY, endY)}px`;
                        selectionBox.style.width = `${Math.abs(endX - startX)}px`;
                        selectionBox.style.height = `${Math.abs(endY - startY)}px`;
                    };

                    const onMouseDown = (e) => {
                        startX = e.clientX;
                        startY = e.clientY;
                        overlay.addEventListener('mousemove', onMouseMove);
                    };

                    const onMouseUp = () => {
                        overlay.removeEventListener('mousemove', onMouseMove);
                        overlay.removeEventListener('mousedown', onMouseDown);
                        overlay.removeEventListener('mouseup', onMouseUp);
                        document.body.removeChild(overlay);
                        resolve({ startX, startY, endX, endY });
                    };

                    overlay.addEventListener('mousedown', onMouseDown);
                    overlay.addEventListener('mouseup', onMouseUp);
                });
            }
        }, (results) => {
            if (results && results[0] && results[0].result) {
                const { startX, startY, endX, endY } = results[0].result;

                // Crop the captured screenshot based on the selected area
                chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (dataUrl, startX, startY, endX, endY) => {
                            return new Promise((resolve) => {
                                const img = new Image();
                                img.src = dataUrl;
                                img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    const ctx = canvas.getContext('2d');
                                    const width = Math.abs(endX - startX);
                                    const height = Math.abs(endY - startY);
                                    canvas.width = width;
                                    canvas.height = height;
                                    const scaleX = img.naturalWidth / window.innerWidth;
                                    const scaleY = img.naturalHeight / window.innerHeight;
                                    ctx.drawImage(img, Math.min(startX, endX) * scaleX, Math.min(startY, endY) * scaleY, width * scaleX, height * scaleY, 0, 0, width, height);
                                    const croppedDataUrl = canvas.toDataURL();
                                    resolve(croppedDataUrl);
                                };
                            });
                        },
                        args: [dataUrl, startX, startY, endX, endY]
                    }, (results) => {
                        if (results && results[0] && results[0].result) {
                            const croppedDataUrl = results[0].result;

                            // Ask for the prompt
                            chrome.scripting.executeScript({
                                target: { tabId: tab.id },
                                func: (croppedDataUrl) => {
                                    // Dark Overlay
                                    const overlay = document.createElement('div');
                                    overlay.style.position = 'fixed';
                                    overlay.style.top = '0';
                                    overlay.style.left = '0';
                                    overlay.style.width = '100vw';
                                    overlay.style.height = '100vh';
                                    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                                    overlay.style.zIndex = '10000';
                                    overlay.style.display = 'flex';
                                    overlay.style.justifyContent = 'center';
                                    overlay.style.alignItems = 'center';

                                    // Prompt Form
                                    const modal = document.createElement('div');
                                    modal.style.backgroundColor = 'white';
                                    modal.style.padding = '20px';
                                    modal.style.borderRadius = '10px';
                                    modal.style.width = '400px';
                                    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                                    modal.style.fontFamily = 'Arial, sans-serif';
                                    modal.style.color = '#333';

                                    modal.innerHTML = `
                                        <h2>Generate response with Gemini</h2>
                                        <img src="${croppedDataUrl}" style="width: 100%; border-radius: 10px;">
                                        <h3>Enter your prompt</h3>
                                        <textarea id="user-prompt" rows="4" style="width: 100%;"></textarea>
                                        <br>
                                        <button id="submit-prompt" style="margin-top: 10px; padding: 5px 10px; border: none; background-color: #333; color: white; border-radius: 5px; cursor: pointer;">Submit</button>
                                        <button id="cancel-prompt" style="margin-top: 10px; padding: 5px 10px; border: none; background-color: #999; color: white; border-radius: 5px; cursor: pointer; margin-left: 10px;">Cancel</button>
                                    `;

                                    overlay.appendChild(modal);
                                    document.body.appendChild(overlay);

                                    // Extract the user's prompt or cancel the prompt
                                    return new Promise((resolve, reject) => {
                                        document.getElementById('submit-prompt').addEventListener('click', () => {
                                            const userPrompt = document.getElementById('user-prompt').value;
                                            overlay.remove();
                                            resolve(userPrompt);
                                        });

                                        document.getElementById('cancel-prompt').addEventListener('click', () => {
                                            overlay.remove();
                                            reject(null);
                                        });
                                    });
                                },
                                args: [croppedDataUrl]
                            }, (results) => {
                                // Get the user's prompt
                                if (results) {
                                    const userPrompt = results[0].result;

                                    sendScreenshotToGemini(croppedDataUrl, userPrompt)
                                        .then(data => {
                                            const responseText = data.candidates[0].content.parts[0].text;

                                            // Display the response in the user's browser context
                                            chrome.scripting.executeScript({
                                                target: { tabId: tab.id },
                                                func: (croppedDataUrl, userPrompt, responseText) => {
                                                    // Check if the modal already exists
                                                    if (document.getElementById('custom-modal')) {
                                                        return;
                                                    }

                                                    // Dark Overaly
                                                    const overlay = document.createElement('div');
                                                    overlay.id = 'custom-modal';
                                                    overlay.style.position = 'fixed';
                                                    overlay.style.top = '0';
                                                    overlay.style.left = '0';
                                                    overlay.style.width = '100vw';
                                                    overlay.style.height = '100vh';
                                                    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                                                    overlay.style.zIndex = '10000';
                                                    overlay.style.display = 'flex';
                                                    overlay.style.justifyContent = 'center';
                                                    overlay.style.alignItems = 'center';

                                                    // Results
                                                    const modal = document.createElement('div');
                                                    modal.style.backgroundColor = 'white';
                                                    modal.style.padding = '20px';
                                                    modal.style.borderRadius = '10px';
                                                    modal.style.width = '400px';
                                                    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                                                    modal.style.fontFamily = 'Arial, sans-serif';
                                                    modal.style.color = '#333';

                                                    modal.innerHTML = `
                                                        <h3>Response</h3>
                                                        <img src="${croppedDataUrl}" style="width: 100%; border-radius: 10px;">
                                                        <p><strong>Prompt:</strong> ${userPrompt}</p>
                                                        <p><strong>Response:</strong> ${responseText}</p>
                                                    `;

                                                    // Close result window button
                                                    const closeButton = document.createElement('button');
                                                    closeButton.textContent = 'Close';
                                                    closeButton.style.marginTop = '10px';
                                                    closeButton.style.padding = '5px 10px';
                                                    closeButton.style.border = 'none';
                                                    closeButton.style.backgroundColor = '#333';
                                                    closeButton.style.color = 'white';
                                                    closeButton.style.borderRadius = '5px';
                                                    closeButton.style.cursor = 'pointer';
                                                    closeButton.addEventListener('click', () => {
                                                        overlay.remove();
                                                    });
                                                    modal.appendChild(closeButton);

                                                    overlay.appendChild(modal);
                                                    document.body.appendChild(overlay);
                                                },
                                                args: [croppedDataUrl, userPrompt, responseText]
                                            });
                                        })
                                        .catch(err => {
                                            console.error("Error sending data to Gemini:", err);
                                        });
                                } else {
                                    // User cancelled the prompt or no input was provided
                                    console.error("No valid prompt received. User might have cancelled the prompt.");
                                };
                            }
                            )
                        }
                    })
                }
        )}
        })
    }
})
        
    