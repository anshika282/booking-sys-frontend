// src/sdk.js

// IMPORTANT: Define your API base URL here.
const API_BASE_URL = 'http://localhost:8000/api/v1'

async function startBookingSession(serviceUuid) {
  console.log('Starting booking session for service UUID:', serviceUuid)
  const storageKey = `booking_session_${serviceUuid}`
  let sessionId = localStorage.getItem(storageKey)

  try {
    console.log(
      'Starting booking session with service UUID:',
      serviceUuid,
      'and session ID:',
      sessionId,
    )
    const response = await fetch(`${API_BASE_URL}/public/booking-intents/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        service_uuid: serviceUuid,
        session_id: sessionId,
      }),
    })

    if (!response.ok) throw new Error('Failed to start session')

    const data = await response.json()
    localStorage.setItem(storageKey, data.session_id)
    return data.session_id
  } catch (error) {
    console.error('Booking Widget: Could not start booking session.', error)
    localStorage.removeItem(storageKey)
    return null
  }
}

function createLoadingModal(message = 'Loading Booking Widget...') {
  // Prevent duplicates
  if (document.getElementById('booking-loader-modal')) return

  const modal = document.createElement('div')
  modal.id = 'booking-loader-modal'
  modal.style.cssText = `
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100vw; 
        height: 100vh; 
        background: rgba(0, 0, 0, 0.7); 
        z-index: 100000; 
        display: flex; 
        flex-direction: column;
        align-items: center; 
        justify-content: center;
        color: white;
        font-family: sans-serif;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
    `

  modal.innerHTML = `
        <div style="width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 15px;">${message}</p>
        <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    `

  document.body.appendChild(modal)

  // Trigger fade in
  requestAnimationFrame(() => {
    modal.style.opacity = '1'
  })
}

function removeLoadingModal() {
  // Find by ID directly so we don't need to pass variables around
  const modalClose = document.getElementById('booking-loader-modal')
  if (!modalClose) return

  modalClose.style.opacity = '0'
  setTimeout(() => {
    if (modalClose.parentNode) modalClose.parentNode.removeChild(modalClose)
  }, 300)
}

async function launchWidget(buttonElement) {
  if (document.getElementById('booking-widget-overlay')) return

  const serviceUuid = buttonElement.getAttribute('data-booking-service')
  const tenantUuid = buttonElement.getAttribute('data-booking-tenant')

  // 1. Show Loader Immediately
  // createLoadingModal()

  if (!serviceUuid || !tenantUuid) {
    // removeLoadingModal()
    console.error('Booking Widget: Button is missing required data attributes.')
    return
  }

  // --- A. Get the button's position for the animation start point ---
  const buttonRect = buttonElement.getBoundingClientRect()

  //--- B. Create the DOM structure ---
  // 1. The dark background overlay
  const overlay = document.createElement('div')
  overlay.id = 'booking-widget-overlay'
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    z-index: 99999; /* Lower z-index */
    opacity: 0; transition: opacity 0.4s ease-in-out;
  `

  // 2. The white container that will animate
  const container = document.createElement('div')
  container.id = 'booking-widget-container'
  container.style.cssText = `
    position: fixed;
    top: ${buttonRect.top}px;
    left: ${buttonRect.left}px;
    width: ${buttonRect.width}px;
    height: ${buttonRect.height}px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    transform-origin: center;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    z-index: 100000; /* Higher z-index to be on top */
    opacity: 0; /* Start invisible for the animation */
  `

  // 3. The loader layer
  const loader = document.createElement('div')
  loader.id = 'booking-widget-loader'
  loader.style.cssText = `
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    opacity: 1; transition: opacity 0.3s ease-out;
    z-index: 2; /* CRITICAL FIX: Loader is on top */
    background: white; /* Loader needs a solid background */
  `
  loader.innerHTML = `<div style="width: 30px; height: 30px; border: 3px solid #e0e0e0; border-top-color: #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>`

  // 4. The iframe layer. Also positioned absolutely, underneath the loader.
  const iframe = document.createElement('iframe')
  iframe.style.cssText = `
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    border: none;
    opacity: 0; /* Initially hidden */
    transition: opacity 0.3s ease-in 0.1s;
    z-index: 1; /* CRITICAL FIX: Iframe is at the bottom */
  `

  // --- C. Append everything to the DOM ---
  // Append loader and iframe to the CONTAINER
  container.appendChild(loader)
  container.appendChild(iframe)

  // Append BOTH overlay and container to the BODY
  document.body.appendChild(overlay)
  document.body.appendChild(container)

  // --- D. Start the animation and API calls ---
  // Animate the overlay and container into their final positions
  requestAnimationFrame(() => {
    overlay.style.opacity = '1'
    container.style.opacity = '1' // Make container visible
    container.style.top = '50%'
    container.style.left = '50%'
    container.style.width = '450px'
    container.style.height = '700px'
    container.style.transform = 'translate(-50%, -50%)'
  })

  // 2. Start Session
  const sessionId = await startBookingSession(serviceUuid)
  if (!sessionId) {
    // removeLoadingModal()
    closeWidget()
    alert('Sorry, the booking widget is currently unavailable. Please try again later.')
    return
  }

  const appUrl = import.meta.env.VITE_APP_URL
  if (!appUrl) {
    // removeLoadingModal()
    closeWidget()
    console.error('Booking Widget Critical Error: VITE_APP_URL is not defined.')
    return
  }

  const iframeUrl = new URL(import.meta.env.VITE_APP_URL + '/booking-flow')
  iframeUrl.searchParams.set('session', sessionId)
  iframe.src = iframeUrl.toString()

  // overlay.appendChild(iframe)

  // 5. Listen for messages from Vue
  const handleMessage = (event) => {
    if (event.origin !== new URL(appUrl).origin) return

    // CLOSE EVENT
    if (event.data === 'booking-widget-close') {
      // Proactively clear the session from localStorage
      const storageKey = `booking_session_${serviceUuid}`
      localStorage.removeItem(storageKey)
      console.log(`Cleared session from localStorage for key: ${storageKey}`)
      closeWidget()
    }

    // READY EVENT (Switch Loader -> Widget)
    if (event.data === 'booking-widget-ready') {
      // removeLoadingModal() // This removes the spinner
      // overlay.style.opacity = '1' // This shows the actual widget
      // Vue app is ready! Cross-fade the loader and the iframe.
      loader.style.opacity = '0'
      setTimeout(() => {
        loader.style.display = 'none'
      }, 300)
      iframe.style.opacity = '1'
    }
  }

  const closeWidget = () => {
    // Find both elements by their ID to be safe.
    const overlayEl = document.getElementById('booking-widget-overlay')
    const containerEl = document.getElementById('booking-widget-container')

    // Animate them out
    if (containerEl) {
      containerEl.style.transform = 'translate(-50%, -50%) scale(0.95)'
      containerEl.style.opacity = '0'
    }
    if (overlayEl) {
      overlayEl.style.opacity = '0'
    }

    // Remove them from the DOM after the animation
    setTimeout(() => {
      if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl)
      if (containerEl && containerEl.parentNode) containerEl.parentNode.removeChild(containerEl)
      window.removeEventListener('message', handleMessage)
    }, 400) // 400ms matches the transition duration
  }

  // Add a global style for the spinner animation
  const styleSheet = document.createElement('style')
  styleSheet.type = 'text/css'
  styleSheet.innerText = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`
  document.head.appendChild(styleSheet)

  window.addEventListener('message', handleMessage)
}

function initialize() {
  const mountPoints = document.querySelectorAll('[data-booking-service]')
  mountPoints.forEach((el) => {
    // Clone node to prevent duplicate event listeners on hot reloads
    const newEl = el.cloneNode(true)
    el.parentNode.replaceChild(newEl, el)
    newEl.addEventListener('click', () => launchWidget(newEl))
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  initialize()
}
