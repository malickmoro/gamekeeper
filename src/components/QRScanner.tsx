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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
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
      onScan(code.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Scan QR Code</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-64 bg-gray-900 rounded-lg"
          />
          <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <button
            onClick={handleManualInput}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Enter Code Manually
          </button>
          
          {!isScanning && (
            <button
              onClick={startScanning}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Start Camera
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center">
          Position the QR code within the frame to scan
        </p>
      </div>
    </div>
  )
} 