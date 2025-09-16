// src/sdk.js
// src/sdk.js

// IMPORTANT: Define your API base URL here. In a real app, this might be configurable.
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
        session_id: sessionId, // Send existing session ID if we have one
      }),
    })

    if (!response.ok) throw new Error('Failed to start session')

    const data = await response.json()
    localStorage.setItem(storageKey, data.session_id) // Save/update the session ID
    return data.session_id
  } catch (error) {
    console.error('Booking Widget: Could not start booking session.', error)
    // Clear a potentially invalid session ID from storage
    localStorage.removeItem(storageKey)
    return null
  }
}

async function launchWidget(buttonElement) {
  if (document.getElementById('booking-widget-overlay')) return

  const serviceUuid = buttonElement.getAttribute('data-booking-service')
  const tenantUuid = buttonElement.getAttribute('data-booking-tenant')

  if (!serviceUuid || !tenantUuid) {
    console.error('Booking Widget: Button is missing required data attributes.')
    return
  }

  // --- NEW LOGIC: Start the session BEFORE opening the widget ---
  const sessionId = await startBookingSession(serviceUuid)
  if (!sessionId) {
    alert('Sorry, the booking widget is currently unavailable. Please try again later.')
    return
  }

  // 1. Get the base URL from the environment variables.
  const appUrl = import.meta.env.VITE_APP_URL

  // 2. Add a guard clause. If the variable is missing, stop and log a clear error.
  if (!appUrl) {
    console.error(
      'Booking Widget Critical Error: VITE_APP_URL is not defined in the environment. The widget cannot load.',
    )
    return
  }

  // 3. Construct the final URL.
  const iframeUrl = new URL(import.meta.env.VITE_APP_URL + '/booking-flow')
  iframeUrl.searchParams.set('session', sessionId) // Pass session ID to the if

  const overlay = document.createElement('div')
  overlay.id = 'booking-widget-overlay'
  overlay.style.cssText =
    'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); z-index:99999; display:flex; align-items:center; justify-content:center;'

  const iframe = document.createElement('iframe')
  iframe.src = iframeUrl.toString()
  iframe.style.cssText =
    'width:100%; max-width:450px; height:90%; max-height:700px; border:none; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.2);'

  overlay.appendChild(iframe)
  document.body.appendChild(overlay)

  const handleMessage = (event) => {
    if (event.origin !== new URL(appUrl).origin) return
    if (event.data === 'booking-widget-close') {
      document.body.removeChild(overlay)
      window.removeEventListener('message', handleMessage)
    }
  }

  window.addEventListener('message', handleMessage)
}

function initialize() {
  const mountPoints = document.querySelectorAll('[data-booking-service]')
  mountPoints.forEach((el) => {
    el.addEventListener('click', () => launchWidget(el))
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize)
} else {
  initialize()
}
