'use client'

import { useState, useRef, useEffect } from 'react'
import jsQR from 'jsqr'

interface QRScannerProps {
  onScan: (result: string) => void
  onClose: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    startScanning()
    return () => {
      stopScanning()
    }
  }, [])

  // Additional cleanup effect to ensure camera is stopped when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop()
          track.enabled = false
        })
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.srcObject = null
        videoRef.current.src = ''
        videoRef.current.load()
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setError('')
      setIsScanning(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }

      // Start QR code detection
      detectQRCode()
    } catch (err) {
      setError('Unable to access camera. Please check permissions.')
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    // Stop all tracks first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        track.enabled = false
      })
      streamRef.current = null
    }
    
    // Clear the video element's srcObject to ensure camera indicator turns off
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
      videoRef.current.load() // Force reload to clear any remaining references
      videoRef.current.removeAttribute('src') // Remove any src attribute
    }
    
    setIsScanning(false)
  }

  const detectQRCode = () => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context || !videoRef.current) return

    const checkFrame = () => {
      if (!videoRef.current || !isScanning) return

      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      context.drawImage(videoRef.current, 0, 0)

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        // QR code detected!
        console.log('QR Code detected:', code.data)
        
        // Extract session code from URL if it's a session URL
        let sessionCode = code.data
        if (code.data.includes('/session/')) {
          const urlParts = code.data.split('/session/')
          if (urlParts.length > 1) {
            sessionCode = urlParts[1].split('?')[0] // Remove query parameters
          }
        }
        
        // Stop scanning before calling onScan
        stopScanning()
        onScan(sessionCode)
        return
      }

      // Continue scanning
      setTimeout(checkFrame, 100)
    }

    checkFrame()
  }

  const handleManualInput = () => {
    const code = prompt('Enter session code manually:')
    if (code && code.trim()) {
      stopScanning()
      onScan(code.trim())
    }
  }

  const handleClose = async () => {
    stopScanning()
    
    // Force garbage collection of video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.src = ''
      videoRef.current.load()
    }
    
    // Add a small delay to ensure camera cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Reload the page to ensure camera is completely released
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900/95 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Scan QR Code</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="relative mb-6">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-64 bg-black rounded-xl"
          />
          <div className="absolute inset-0 border-2 border-purple-500 rounded-xl pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500"></div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleManualInput}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
          >
            Enter Code Manually
          </button>
          
          {!isScanning && (
            <button
              onClick={startScanning}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Start Camera
            </button>
          )}
        </div>

        <p className="text-sm text-gray-400 mt-4 text-center">
          Position the QR code within the frame to scan
        </p>
      </div>
    </div>
  )
} 