document.getElementById('analyzeBtn').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    const btn = document.getElementById('analyzeBtn');
    
    btn.disabled = true;
    btn.textContent = 'Scanning...';
    statusEl.innerHTML = '<span style="color:#6366f1">Connecting to FINORA Oracle...</span>';
    
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Simulate delay
    setTimeout(() => {
        statusEl.innerHTML = `
        <strong style="color:#10b981">Scan Complete.</strong><br/>
        Page: ${tab.url.substring(0, 30)}...<br/><br/>
        <strong style="color:red">Risk Detected:</strong> Pricing is 14% higher than APAC benchmark. <br/><br/>
        <em>Recommendation:</em> Route billing through Singapore (9% VAT) instead of standard 18% GST tier.
        `;
        btn.textContent = 'Report Generated';
    }, 1500);
});
