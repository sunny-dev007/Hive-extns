chrome.action.onClicked.addListener((tab) => {
  if (
    !tab.url.startsWith("chrome://") &&
    !tab.url.startsWith("chrome-extension://")
  ) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: toggleSidePanel,
    });
  } else {
    console.error(
      "Cannot inject script into chrome:// or chrome-extension:// pages."
    );
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "capture_screenshot") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message,
        });
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: sender.tab.id },
          function: scrapePageText,
        },
        (results) => {
          if (results && results[0].result) {
            sendResponse({
              success: true,
              screenshotUrl: image,
              pageText: results[0].result,
            });
          } else {
            sendResponse({
              success: false,
              error: "Failed to scrape page text.",
            });
          }
        }
      );
    });
    return true;
  }
});

function scrapePageText() {
  return document.body.innerText || "";
}

function toggleSidePanel() {
  const existingPanel = document.getElementById("hive-side-panel");

  if (existingPanel) {
    existingPanel.remove();
    document.body.style.marginRight = "0"; // Reset margin
    return;
  }

  const sidePanel = document.createElement("div");
  sidePanel.id = "hive-side-panel";
  sidePanel.style.position = "fixed";
  sidePanel.style.top = "0";
  sidePanel.style.right = "0";
  sidePanel.style.width = "400px";
  sidePanel.style.height = "100vh";
  sidePanel.style.backgroundColor = "#fff";
  sidePanel.style.boxShadow = "-4px 0 10px rgba(0,0,0,0.1)";
  sidePanel.style.zIndex = "10000";
  sidePanel.style.display = "flex";
  sidePanel.style.flexDirection = "column"; // Added flex layout

  sidePanel.innerHTML = `
    <div style="padding: 20px; flex: 1; overflow-y: auto;">
      <h1 style="font-size: 22px; color: #333;">HIVE Portal</h1>

      <!-- Mode selection buttons -->
      <div style="margin-bottom: 20px;">
        <button id="autoModeButton" style="margin-right: 10px; padding: 10px; background-color: #4CAF50; color: white; border: none;">Auto Mode</button>
        <button id="manualModeButton" style="padding: 10px; background-color: #cdc3b3; color: white; border: none;">Manual Mode</button>
      </div>

      <!-- Tag management -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 18px; color: #333;">Tags</h3>
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
          <input id="tagInput" type="text" placeholder="Enter tag" 
            style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
          <button id="addTagButton" 
            style="padding: 10px 15px; background-color: #3c786e; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Add Tag
          </button>
        </div>
        <div id="tagList" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;"></div>
      </div>

      <button id="captureButton" style="
        width: 100%; padding: 12px; background-color: #3c786e; color: white; border: none;
        border-radius: 8px; font-size: 18px; cursor: pointer;">Capture Snapshot</button>
      <div id="screenshotList" style="margin-top: 20px; max-height: 400px; overflow-y: auto;"></div>
    </div>

    <!-- Footer with button -->
    <div style="padding: 20px; border-top: 1px solid #ddd;">
      <button id="sendToRepoButton" style="
        width: 100%; padding: 15px; background-color: #4CAF50; color: white; border: none;
        border-radius: 8px; font-size: 16px; cursor: pointer;">Send Screenshot to Repository</button>
    </div>
  `;

  document.body.appendChild(sidePanel);
  document.body.style.marginRight = "400px"; // Shift body content for panel

  let mode = "auto"; // Default mode

  const autoButton = document.getElementById("autoModeButton");
  const manualButton = document.getElementById("manualModeButton");

  // Function to update button styles based on active mode
  function updateModeButtons() {
    if (mode === "auto") {
      autoButton.style.backgroundColor = "#4CAF50"; // Active color
      manualButton.style.backgroundColor = "#cdc3b3"; // Inactive color
    } else {
      autoButton.style.backgroundColor = "#cdc3b3"; // Inactive color
      manualButton.style.backgroundColor = "#4CAF50"; // Active color
    }
  }

  autoButton.addEventListener("click", () => {
    mode = "auto";
    updateModeButtons();
    alert("Auto Mode Activated");
    updateAddTagVisibility(); // Update visibility of Add Tag option in cards
  });

  manualButton.addEventListener("click", () => {
    mode = "manual";
    updateModeButtons();
    alert("Manual Mode Activated");
    updateAddTagVisibility(); // Update visibility of Add Tag option in cards
  });

  document.getElementById("addTagButton").addEventListener("click", () => {
    const tagInput = document.getElementById("tagInput");
    const tag = tagInput.value.trim();
    if (tag) {
      addTag(tag);
      tagInput.value = ""; // Clear input
    }
  });

  // Function to send JSON data to repository endpoint
function sendDataToRepository(screenshotsData) {
  const loader = document.createElement("div");
  loader.id = "loader";
  loader.style.position = "absolute";
  loader.style.top = "50%";
  loader.style.left = "50%";
  loader.style.transform = "translate(-50%, -50%)";
  loader.style.border = "8px solid #f3f3f3";
  loader.style.borderTop = "8px solid #3498db";
  loader.style.borderRadius = "50%";
  loader.style.width = "60px";
  loader.style.height = "60px";
  loader.style.animation = "spin 2s linear infinite";
  document.body.appendChild(loader);

  fetch('http://localhost:8080/api/v1/webclip/sendtorepo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(screenshotsData), // Convert JSON to string for sending
  })
    .then((response) => {
      loader.remove(); // Hide loader
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((data) => {
      loader.remove(); // Hide loader
      console.log('Successfully sent to repository:', data);
      alert('Data successfully sent to repository');
    })
    .catch((error) => {
      loader.remove(); // Hide loader
      console.error('Error sending data to repository:', error);
      alert('Failed to send data to repository');
    });
}

  // Add a tag to the tag list (UI and storage)
  function addTag(tag) {
    const tagList = document.getElementById("tagList");
    const tagElement = document.createElement("span");
    tagElement.innerHTML = `<span>${tag}</span> <button class="removeTagButton" style="background-color: red; color: white;">x</button>`;
    tagElement.style.padding = "5px";
    tagElement.style.marginRight = "10px";
    tagElement.style.backgroundColor = "#c78530";
    tagElement.style.color = "white";
    tagList.appendChild(tagElement);

    storeTag(tag);
    tagElement
      .querySelector(".removeTagButton")
      .addEventListener("click", () => {
        tagElement.remove();
        removeTag(tag);
      });
  }

  // Store the tags in chrome.storage
  function storeTag(tag) {
    chrome.storage.local.get(["tags"], (result) => {
      const tags = result.tags || [];
      tags.push(tag);
      chrome.storage.local.set({ tags });
    });
  }

  // Load tags from storage
  function loadTags() {
    chrome.storage.local.get(["tags"], (result) => {
      const tags = result.tags || [];
      const tagList = document.getElementById("tagList");
      tagList.innerHTML = ""; // Clear the list
      tags.forEach((tag) => {
        addTag(tag);
      });
    });
  }

  // Remove a tag from storage
  function removeTag(tag) {
    chrome.storage.local.get(["tags"], (result) => {
      let tags = result.tags || [];
      tags = tags.filter((t) => t !== tag);
      chrome.storage.local.set({ tags });
    });
  }

  function addDropdownTags(tagsContainer) {
    chrome.storage.local.get(["tags"], (result) => {
      const tags = result.tags || [];
      const dropdown = document.createElement("select");
      dropdown.style.marginTop = "5px";

      tags.forEach((tag) => {
        const option = document.createElement("option");
        option.value = tag;
        option.innerText = tag;
        dropdown.appendChild(option);
      });

      dropdown.addEventListener("change", () => {
        const selectedTag = dropdown.value;
        addTagToCard(selectedTag, tagsContainer);
      });

      tagsContainer.appendChild(dropdown);
    });
  }

  let screenshotsData = []; // Array to store multiple screenshot entries

  function captureScreenshot() {
    const loader = document.createElement("div");
    loader.id = "loader";
    loader.style.position = "absolute";
    loader.style.top = "50%";
    loader.style.left = "50%";
    loader.style.transform = "translate(-50%, -50%)";
    loader.style.border = "8px solid #f3f3f3";
    loader.style.borderTop = "8px solid #3498db";
    loader.style.borderRadius = "50%";
    loader.style.width = "60px";
    loader.style.height = "60px";
    loader.style.animation = "spin 2s linear infinite";
    document.body.appendChild(loader);

    // Hide the extension sidebar before capturing the screenshot ***
    const extensionSidebar = document.querySelector('#hive-side-panel');
    if (extensionSidebar) extensionSidebar.style.display = 'none';


    chrome.runtime.sendMessage(
      { message: "capture_screenshot" },
      (response) => {
        // Restore the sidebar after the screenshot is captured ***
        if (extensionSidebar) extensionSidebar.style.display = '';
        loader.remove(); // Hide loader

        if (response.success) {
          const { screenshotUrl, pageText } = response;

          // Extract the title from the DOM
          const pageTitle = document.title || "Untitled Page";

          const readableContent = extractReadableContent();

          // Prepare JSON for the captured screenshot
          const screenshotEntry = {
            url: window.location.href, // Web page URL
            timestamp: new Date().toISOString(), // Current timestamp in ISO format
            snapshot_cover_image: screenshotUrl, // Screenshot data
            dom_text: pageText, // Extracted DOM text
            dom_html: getFilteredDOM(), // Filtered HTML excluding sidebar
            readable_content: readableContent, // Extracted readable body content
            page_title: pageTitle,
            tags: [], // Tags will be populated later
            user_id: "skushwaha-cont@hanoverresearch.com", // Replace with actual user ID if available
          };

          // Create UI for the captured screenshot card
          createScreenshotCard(screenshotEntry);

          // Append the screenshot entry to the array
          screenshotsData.push(screenshotEntry);

          console.log("Updated JSON:", screenshotsData); // Log the JSON to verify
        } else {
          console.error("Screenshot failed:", response.error);
        }
      }
    );
  }

  /**
 * Extracts and returns the readable content from the page's body,
 * excluding unnecessary elements.
 */
/**
 * Extracts readable content from the body, removing unnecessary elements 
 * and cleaning HTML entities for plain text output.
 */
function extractReadableContent() {
  const body = document.body.cloneNode(true); // Clone the page body

  // Remove unwanted elements (sidebar, ads, scripts, popups, etc.)
  const selectorsToRemove = [
    '#hive-side-panel', 'nav', 'footer', 'aside', 
    'script', 'noscript', 'style', 'iframe', 
    '.ad', '.popup', '.banner'
  ];
  selectorsToRemove.forEach(selector => {
    body.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Keep only essential images and charts with valid sources
  body.querySelectorAll('img, canvas').forEach(el => {
    if (!el.src) el.remove(); // Remove elements without valid sources
  });

  // Convert HTML to plain text, excluding HTML entities
  const textContent = body.innerHTML
    .replace(/<\/?[^>]+(>|$)/g, '')  // Remove HTML tags
    .replace(/&[a-zA-Z]+;/g, '')     // Remove HTML entities
    .trim();                         // Trim extra whitespace

  return textContent;
}


/**
 * Filters out the extension sidebar and returns the outer HTML without it.
 */
function getFilteredDOM() {
  const clonedDocument = document.documentElement.cloneNode(true);

  // Remove the extension sidebar from the cloned DOM
  const sidebar = clonedDocument.querySelector('#hive-side-panel');
  if (sidebar) sidebar.remove();

  return clonedDocument.outerHTML; // Return filtered HTML
}

  // Function to create screenshot card UI
  function createScreenshotCard(screenshotEntry) {
    const screenshotList = document.getElementById("screenshotList");

    const card = document.createElement("div");
    card.className = "card";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.padding = "15px";
    card.style.backgroundColor = "#ffffff";
    card.style.borderRadius = "8px";
    card.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.1)";
    card.style.marginBottom = "15px";
    card.style.border = "1px solid #e0e0e0";

    const img = document.createElement("img");
    img.src = screenshotEntry.snapshot_cover_image;
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.borderRadius = "8px";
    img.style.marginBottom = "10px";

    const textDiv = document.createElement("div");
    textDiv.innerHTML = `
    <div style="font-size: 16px; font-weight: bold;">${
      screenshotEntry.page_title
    }</div>
    <div style="font-size: 14px; color: #666;">${screenshotEntry.dom_text.slice(
      0,
      50
    )}...</div>
  `;

    textDiv.style.marginBottom = "10px";

    const bottomSection = document.createElement("div");
    bottomSection.style.display = mode === "manual" ? "flex" : "none"; // Conditional visibility
    bottomSection.style.display = "flex";
    bottomSection.style.justifyContent = "space-between";
    bottomSection.style.alignItems = "center";
    bottomSection.style.padding = "10px 0";
    bottomSection.style.borderTop = "1px solid #e0e0e0";

    // Tag Dropdown
    const tagDropdown = document.createElement("select");
    tagDropdown.style.display = mode === "manual" ? "block" : "none"; // Conditional visibility
    tagDropdown.style.flex = "1";
    tagDropdown.style.marginRight = "10px";
    tagDropdown.style.padding = "8px";
    tagDropdown.style.borderRadius = "4px";

    chrome.storage.local.get(["tags"], (result) => {
      const tags = result.tags || [];
      tags.forEach((tag) => {
        const option = document.createElement("option");
        option.value = tag;
        option.innerText = tag;
        tagDropdown.appendChild(option);
      });
    });

    // Add Tags Button
    const addTagsButton = document.createElement("button");
    addTagsButton.innerText = "Add Tags";
    addTagsButton.style.display = mode === "manual" ? "inline-block" : "none"; // Conditional visibility
    addTagsButton.style.padding = "8px 12px";
    addTagsButton.style.backgroundColor = "#3498db";
    addTagsButton.style.color = "white";
    addTagsButton.style.border = "none";
    addTagsButton.style.borderRadius = "4px";
    addTagsButton.style.cursor = "pointer";

    const tagsContainer = document.createElement("div");
    tagsContainer.style.display = "flex";
    tagsContainer.style.flexWrap = "wrap";
    tagsContainer.style.gap = "5px";
    tagsContainer.style.marginTop = "10px";

    addTagsButton.addEventListener("click", () => {
      const selectedTag = tagDropdown.value;
      if (selectedTag) {
        const tagElement = document.createElement("span");
        tagElement.innerText = selectedTag;
        tagElement.style.padding = "5px 10px";
        tagElement.style.backgroundColor = "#c78530";
        tagElement.style.color = "white";
        tagElement.style.borderRadius = "4px";
        tagsContainer.appendChild(tagElement);

        // Add the selected tag to the JSON entry
        screenshotEntry.tags.push(selectedTag);
      }
    });

    // Delete Button
    const deleteButton = document.createElement("button");
    deleteButton.innerText = "Delete";
    deleteButton.style.padding = "8px 12px";
    deleteButton.style.backgroundColor = "#e74c3c";
    deleteButton.style.color = "white";
    deleteButton.style.border = "none";
    deleteButton.style.borderRadius = "4px";
    deleteButton.style.cursor = "pointer";
    deleteButton.addEventListener("click", () => {
      card.remove();

      // Remove the entry from the JSON array
      screenshotsData = screenshotsData.filter(
        (entry) => entry !== screenshotEntry
      );
      console.log("Updated JSON after deletion:", screenshotsData);
    });

    bottomSection.appendChild(tagDropdown);
    bottomSection.appendChild(addTagsButton);
    bottomSection.appendChild(deleteButton);

    card.appendChild(img);
    card.appendChild(textDiv);
    card.appendChild(tagsContainer);
    card.appendChild(bottomSection);

    screenshotList.appendChild(card);
  }

  // Attach the event listener to the capture button
  document.getElementById("captureButton").addEventListener("click", () => {
    captureScreenshot();
  });

  // Attach event listener to the "Send Screenshot to Repository" button
  document.getElementById("sendToRepoButton").addEventListener("click", () => {
    alert("Sending screenshots to repository..."); // Placeholder for actual functionality
    sendDataToRepository(screenshotsData); // Send the screenshotsData
  });

  loadTags(); // Load existing tags when the panel opens

  // Function to update the visibility of Add Tag in card view
  function updateAddTagVisibility() {
    const addTagOptions = document.querySelectorAll(".card .addTagOption");
    addTagOptions.forEach((option) => {
      option.style.display = mode === "manual" ? "block" : "none"; // Show or hide based on mode
    });
  }

  function addTagToCardIn(tag, tagsContainer) {
    const tagElement = document.createElement("span");
    tagElement.innerText = tag;
    tagElement.style.backgroundColor = "#c78530";
    tagElement.style.color = "white";
    tagElement.style.padding = "5px 10px";
    tagElement.style.borderRadius = "4px";
    tagsContainer.appendChild(tagElement);
  }
}

// Function to add a tag to the card
function addTagToCard(tag, tagsContainer) {
  const tagElement = document.createElement("span");
  tagElement.innerText = tag;
  tagElement.style.backgroundColor = "#cdc3b3";
  tagElement.style.color = "white";
  tagElement.style.padding = "5px 10px";
  tagElement.style.borderRadius = "4px";
  tagsContainer.appendChild(tagElement);
}
