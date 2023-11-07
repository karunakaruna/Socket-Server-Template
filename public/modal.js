
  function updateModalContent(url) {
        // Prevent default behavior of anchor tags
        //event.preventDefault();

        // Fetch new modal content based on provided URL
        fetch(url)
            .then(response => response.text())
            .then(html => {
                document.getElementById('modal-content').innerHTML = html;
            })
            .catch(error => console.error('Error:', error));
        };
