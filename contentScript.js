function captureScreenshot() {
  const loader = document.createElement('div');
  loader.id = 'loader';
  loader.style.position = 'absolute';
  loader.style.top = '50%';
  loader.style.left = '50%';
  loader.style.transform = 'translate(-50%, -50%)';
  loader.style.border = '8px solid #f3f3f3';
  loader.style.borderTop = '8px solid #3498db';
  loader.style.borderRadius = '50%';
  loader.style.width = '60px';
  loader.style.height = '60px';
  loader.style.animation = 'spin 2s linear infinite';

  document.getElementById('hive-side-panel').appendChild(loader);

  // Send the message to the background script to take the screenshot
  chrome.runtime.sendMessage({ message: 'capture_screenshot' }, (response) => {
    loader.remove(); // Hide the loader after screenshot

    if (response.success) {
      const screenshotList = document.getElementById('screenshotList');

      // Create a card to show the screenshot
      const card = document.createElement('div');
      card.className = 'card';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.padding = '10px';
      card.style.backgroundColor = '#f9f9f9';
      card.style.borderRadius = '8px';
      card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      card.style.marginBottom = '10px';

      const img = document.createElement('img');
      img.src = response.screenshotUrl;
      img.style.width = '100px';
      img.style.height = '100px';
      img.style.marginRight = '10px';
      img.style.borderRadius = '4px';

      const textDiv = document.createElement('div');
      textDiv.innerText = 'Captured text: ' + response.pageText.slice(0, 80) + '...';

      const deleteBtn = document.createElement('button');
      deleteBtn.innerText = 'Delete';
      deleteBtn.style.marginLeft = 'auto';
      deleteBtn.style.padding = '5px 10px';
      deleteBtn.style.backgroundColor = 'red';
      deleteBtn.style.color = 'white';
      deleteBtn.style.border = 'none';
      deleteBtn.style.borderRadius = '4px';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.addEventListener('click', () => {
        card.remove();
      });

      card.appendChild(img);
      card.appendChild(textDiv);
      card.appendChild(deleteBtn);
      screenshotList.appendChild(card);
    } else {
      console.error('Screenshot failed: ', response.error);
    }
  });
}
