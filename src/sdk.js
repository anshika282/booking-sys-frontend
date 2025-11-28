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
  createLoadingModal()

  if (!serviceUuid || !tenantUuid) {
    removeLoadingModal()
    console.error('Booking Widget: Button is missing required data attributes.')
    return
  }

  // 2. Start Session
  const sessionId = await startBookingSession(serviceUuid)
  if (!sessionId) {
    removeLoadingModal()
    alert('Sorry, the booking widget is currently unavailable. Please try again later.')
    return
  }

  const appUrl = import.meta.env.VITE_APP_URL
  if (!appUrl) {
    removeLoadingModal()
    console.error('Booking Widget Critical Error: VITE_APP_URL is not defined.')
    return
  }

  const iframeUrl = new URL(import.meta.env.VITE_APP_URL + '/booking-flow')
  iframeUrl.searchParams.set('session', sessionId)

  // 3. Create Overlay (Hidden Initially)
  const overlay = document.createElement('div')
  overlay.id = 'booking-widget-overlay'
  overlay.style.cssText =
    'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); z-index:99999; display:flex; align-items:center; justify-content:center; opacity: 0; transition: opacity 0.3s ease-in-out;'

  const iframe = document.createElement('iframe')
  iframe.src = iframeUrl.toString()
  iframe.style.cssText =
    'width:100%; max-width:450px; height:90%; max-height:700px; border:none; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.2);'

  overlay.appendChild(iframe)

  // 4. Append to DOM immediately so it loads
  document.body.appendChild(overlay)

  // 5. Listen for messages from Vue
  const handleMessage = (event) => {
    if (event.origin !== new URL(appUrl).origin) return

    // CLOSE EVENT
    if (event.data === 'booking-widget-close') {
      overlay.style.opacity = '0'
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
        window.removeEventListener('message', handleMessage)
      }, 300)
    }

    // READY EVENT (Switch Loader -> Widget)
    if (event.data === 'booking-widget-ready') {
      removeLoadingModal() // This removes the spinner
      overlay.style.opacity = '1' // This shows the actual widget
    }
  }

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
