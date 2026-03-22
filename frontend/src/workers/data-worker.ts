/**
 * Worker for parsing ArrayBuffer binary data
 */

self.onmessage = async (e) => {
  const { type, buffer, layerId } = e.data;
  
  if (type === 'PARSE_BINARY') {
    try {
      const header = new DataView(buffer);
      const count = header.getUint32(0, true);
      const stride = header.getUint32(4, true);
      const data = new Float32Array(buffer, 8);
      
      self.postMessage({
        type: 'PARSE_SUCCESS',
        layerId,
        result: { count, stride, data }
      });
    } catch (err: any) {
      self.postMessage({
        type: 'PARSE_ERROR',
        layerId,
        error: err.message
      });
    }
  }
};
