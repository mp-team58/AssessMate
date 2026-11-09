import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { getSignedMediaUrl, clearMediaCache } from '../services/mediaService';
import { SecureImage, SecureAudio } from '../components/SecureMedia';
import apiClient from '../services/apiClient';

vi.mock('../services/apiClient', () => {
  return {
    BASE_URL: 'https://assessmate-p27x.onrender.com/api',
    default: {
      get: vi.fn(),
      post: vi.fn()
    }
  };
});

describe('Secure Media & Supabase Private Storage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMediaCache();
  });

  it('1. Returns absolute external URLs directly without querying signed-url API', async () => {
    const externalUrl = 'https://example.com/figure.png';
    const result = await getSignedMediaUrl(externalUrl);
    expect(result).toBe(externalUrl);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('2. Fetches signed URL from backend for private question objects', async () => {
    const objectPath = 'questions/q_104_a83f29c1.png';
    const mockSigned = 'https://vpdgjxmkluecxbhizzcd.supabase.co/storage/v1/object/sign/assessmate-media/questions/q_104_a83f29c1.png?token=mock_jwt';

    apiClient.get.mockResolvedValueOnce({
      data: {
        objectPath,
        signedUrl: mockSigned,
        expiresIn: 900
      }
    });

    const url = await getSignedMediaUrl(objectPath);
    expect(url).toBe(mockSigned);
    expect(apiClient.get).toHaveBeenCalledWith('/storage/signed-url', {
      params: { objectPath }
    });
  });

  it('3. In-memory cache returns cached URL without duplicate network requests', async () => {
    const objectPath = 'questions/q_104_b27d41e8.png';
    const mockSigned = 'https://supabase.co/signed-b27d41e8';

    apiClient.get.mockResolvedValueOnce({
      data: {
        objectPath,
        signedUrl: mockSigned,
        expiresIn: 900
      }
    });

    // First call triggers API
    const url1 = await getSignedMediaUrl(objectPath);
    expect(url1).toBe(mockSigned);
    expect(apiClient.get).toHaveBeenCalledTimes(1);

    // Second call reads from memory cache
    const url2 = await getSignedMediaUrl(objectPath);
    expect(url2).toBe(mockSigned);
    expect(apiClient.get).toHaveBeenCalledTimes(1); // Still 1!
  });

  it('4. clearMediaCache clears the in-memory cache', async () => {
    const objectPath = 'questions/q_104_b27d41e8.png';
    apiClient.get.mockResolvedValue({
      data: { objectPath, signedUrl: 'https://supabase.co/test', expiresIn: 900 }
    });

    await getSignedMediaUrl(objectPath);
    expect(apiClient.get).toHaveBeenCalledTimes(1);

    clearMediaCache();

    await getSignedMediaUrl(objectPath);
    expect(apiClient.get).toHaveBeenCalledTimes(2); // re-fetched
  });

  it('5. SecureImage renders loading state then displays image tag with signed URL', async () => {
    const objectPath = 'questions/q_50_c11d22e3.png';
    const mockSigned = 'https://supabase.co/image50.png';

    apiClient.get.mockResolvedValueOnce({
      data: { objectPath, signedUrl: mockSigned, expiresIn: 900 }
    });

    render(<SecureImage src={objectPath} alt="Test Diagram" className="test-img" />);

    // Initially loading
    expect(screen.getByText(/loading image/i)).toBeInTheDocument();

    // After resolving signed URL
    await waitFor(() => {
      const img = screen.getByAltText('Test Diagram');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', mockSigned);
      expect(img).toHaveClass('test-img');
    });
  });

  it('6. SecureImage renders fallback UI when signed URL request fails', async () => {
    const objectPath = 'questions/missing.png';
    apiClient.get.mockRejectedValueOnce(new Error('404 Not Found'));

    render(<SecureImage src={objectPath} alt="Missing Figure" />);

    await waitFor(() => {
      expect(screen.getByText(/image unavailable/i)).toBeInTheDocument();
    });
  });

  it('7. SecureAudio renders audio tag with playback controls for proctoring audio', async () => {
    const audioPath = 'proctoring/audio/p_20_b27d41e8.webm';
    const mockSignedAudio = 'https://supabase.co/audio_evidence.webm';

    apiClient.get.mockResolvedValueOnce({
      data: { objectPath: audioPath, signedUrl: mockSignedAudio, expiresIn: 900 }
    });

    render(<SecureAudio src={audioPath} className="audio-player" />);

    await waitFor(() => {
      const audio = document.querySelector('audio');
      expect(audio).toBeInTheDocument();
      expect(audio).toHaveAttribute('src', mockSignedAudio);
      expect(audio).toHaveAttribute('controls');
      expect(audio).toHaveAttribute('preload', 'metadata');
    });
  });
});

