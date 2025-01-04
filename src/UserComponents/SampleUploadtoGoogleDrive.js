import React, { useState } from 'react';

const SampleUploadtoGoogleDrive = () => {
  const [imageSrc, setImageSrc] = useState(""); // State to store the image preview
  const [file, setFile] = useState(null); // State to store the selected file

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      // Create a FileReader to read the selected file
      const reader = new FileReader();
      
      // When the file is loaded, update the image source and send the data to the server
      reader.onloadend = () => {
        const imageData = reader.result;
        setImageSrc(imageData); // Set the image preview

        // Extract the base64 data
        const base64Data = imageData.split("base64,")[1];

        // Prepare the data object to send in the request
        const data = {
          base64: base64Data,
          type: selectedFile.type,
          name: selectedFile.name,
        };

        // Send the data to the server via a POST request
        fetch("Api_Endpoint_Url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })
        .then((response) => response.text()) // Handle the response
        .then((responseData) => console.log(responseData))
        .catch((error) => console.error("Error uploading file:", error));
      };

      // Read the file as a data URL
      reader.readAsDataURL(selectedFile);
    }
  };

  return (
    <div>
      <h1>Image Upload</h1>
      {/* File input element to select image */}
      <input type="file" accept="image/*" onChange={handleFileChange} />
      
      {/* Image preview */}
      {imageSrc && <img src={imageSrc} alt="Preview" style={{ maxWidth: "100%", maxHeight: "300px" }} />}
    </div>
  );
};

export default SampleUploadtoGoogleDrive;
