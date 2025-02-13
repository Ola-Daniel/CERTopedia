# Contributing to CERTopedia

Thank you for your interest in contributing to CERTopedia! This project aims to maintain an accurate and up-to-date database of Computer Emergency Response Teams (CERTs) worldwide.

## How to Contribute

### 1. Fork the Repository
- Navigate to the [CERTopedia GitHub repository](https://github.com/Ola-Daniel/CERTopedia.git) and click the **Fork** button.
- Clone the forked repository to your local machine using:
  ```sh
  git clone https://github.com/your-username/CERTopedia.git
  cd CERTopedia
  ```

### 2. Add a New CERT Entry
- Open the `data/certs.json` file.
- Add a new entry in **alphabetical order**, following this format:
  ```json
  {
    "country": "Canada",
    "cert_name": "Canadian Centre for Cyber Security",
    "website": "https://www.cyber.gc.ca/",
    "emergency_phone": "+1-800-282-1376",
    "established_date": "2018",
    "additional_info": "",
  }
  ```
- Ensure that the data comes from an **official CERT website or government source**.

### 3. Verify Data Authenticity
- Provide an official source link for the added data.
- Ensure accuracy by cross-referencing with multiple sources if necessary.

### 4. Commit and Push Changes
- Create a new branch for your changes:
  ```sh
  git checkout -b add-country-cert
  ```
- Commit your changes with a meaningful message:
  ```sh
  git commit -am "Added CERT for Canada"
  ```
- Push to your forked repository:
  ```sh
  git push origin add-country-cert
  ```

### 5. Open a Pull Request (PR)
- Go to the original **CERTopedia** repository on GitHub.
- Click **New Pull Request** and select your forked branch.
- Provide a **clear description** of the changes and include the official source link.

### 6. Review and Approval
- A project maintainer will review your submission.
- If approved, your changes will be merged into the main repository.
- If modifications are required, you’ll be notified in the PR comments.

## Contribution Guidelines
- Ensure the country name is in **alphabetical order** within `certs.json`.
- Only include **official CERTs** verified by a government or cybersecurity authority.
- Keep all text and formatting consistent with the existing structure.

We appreciate your contributions in making CERTopedia a valuable resource for cybersecurity professionals worldwide! 🚀

