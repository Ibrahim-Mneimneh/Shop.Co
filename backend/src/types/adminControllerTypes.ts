// Check size and validity of base64Images
export const isValidBase64 = (base64String:string):boolean=>{
    try{
      const base64Regex = /^data:image\/([a-zA-Z]*);base64,([A-Za-z0-9+/=]*)$/;
      const match = base64String.match(base64Regex)
      if(!match)
        return false
      const base64Content = match[2]
      
        const decodedBuffer = Buffer.from(base64Content,"base64")
        const decodedSize = decodedBuffer.length

        const maxSize = 4*1024*1024

        return decodedSize<=maxSize
      }catch(error){
        console.log("Image Validity checing error - ")
        return false
      }
} 