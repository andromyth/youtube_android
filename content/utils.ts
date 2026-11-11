export function emit(type: string, data?: any) {
  if (window.VideoAppI) {
    window.VideoAppI.onMessage(JSON.stringify({ type, data }))
  } else if (window.electron) {
    window.electron.ipcRenderer.sendToHost(type, data)
  }
}

export function log(...data: any[]) {
  console.log(...data)
  emit('[content]', data.length > 1 ? { data: [...data] } : data[0])
}

export function parseJson(v: string | null, fallback: any) {
  if (!v) {
    return fallback
  }
  try {
    return JSON.parse(v)
  } catch (e) {
    return fallback
  }
}

export const videoPolicy = window.trustedTypes.createPolicy('videoPolicy', {
  createHTML: (x: string) => x,
})

export const isYTMusic = document.location.host == 'music.youtube.com'
