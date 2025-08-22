# 🌍 CERTopedia: The Global CERT Directory

Welcome to **CERTopedia**, a comprehensive and community-driven directory of **Computer Emergency Response Teams (CERTs)** from around the world. Our goal is to maintain an **accurate, up-to-date, and verified** repository of cybersecurity emergency contacts to help organizations and individuals respond effectively to cyber threats.

---

## 📌 Why CERTopedia?
- 🛡 **Reliable CERT Information** – Access official CERT websites, emergency contact numbers, and establishment details.
- 🌎 **Global Coverage** – We aim to list **every national CERT** in **alphabetical order**.
- 🤝 **Community-Driven** – Anyone can contribute and help keep the information updated.
- 🔍 **Verification Process** – Every submission is reviewed for authenticity before being merged.

---

## 📖 Table of Contents
- [🌍 CERTopedia: The Global CERT Directory](#-certopedia-the-global-cert-directory)
  - [📌 Why CERTopedia?](#-why-certopedia)
  - [📖 Table of Contents](#-table-of-contents)
  - [📂 Project Structure](#-project-structure)
  - [🚀 Getting Started](#-getting-started)
  - [📥 Contributing](#-contributing)
  - [✅ Data Verification](#-data-verification)
  - [📜 License](#-license)
  - [💡 Acknowledgments](#-acknowledgments)

---

## 📂 Project Structure
```
CERTopedia/
├── index.html              # Homepage with interactive CERT directory
├── data/
│   └── certs.json          # CERT database (main data source)
├── assets/
│   ├── css/
│   │   └── styles.css      # Responsive styling
│   ├── js/
│   │   └── main.js         # Search, filter, and interactive features
│   └── images/
│       └── favicon.svg     # Site icon
├── sw.js                   # Service worker for offline functionality
├── README.md               # This file
├── CONTRIBUTING.md         # Contribution guidelines
├── AUTHENTICATION.md       # Data verification process
└── LICENSE                 # MIT License
```

---

## 🚀 Getting Started

### Option 1: View the Interactive Directory
1. **Clone the Repository**
   ```sh
   git clone https://github.com/Ola-Daniel/CERTopedia.git
   cd CERTopedia
   ```

2. **Start a Local Server**
   ```sh
   # Using Python
   python3 -m http.server 8000
   
   # Or using Node.js
   npx serve .
   ```

3. **Open in Browser**
   Navigate to `http://localhost:8000` to explore the interactive CERT directory.

### Option 2: View Raw Data
Open `data/certs.json` to browse the CERT database directly.

## 📋 Data Format
Each CERT entry in `data/certs.json` follows this structure:

```json
{
  "country": "Country Name",
  "name": "CERT Acronym",
  "fullName": "Complete Organization Name",
  "website": "https://official-website.domain",
  "emergencyContact": "+XX XXX XXX XXXX",
  "email": "contact@cert.domain",
  "established": "YYYY",
  "description": "Brief description of the CERT's role and responsibilities",
  "sector": "Government|National|Academic|Commercial",
  "verified": true,
  "lastUpdated": "YYYY-MM-DD"
}
```

### Required Fields
- **country**: ISO country name (for alphabetical sorting)
- **name**: Official CERT acronym/short name
- **fullName**: Complete organizational name
- **website**: Official CERT website URL
- **emergencyContact**: Primary emergency phone number
- **email**: Official contact email
- **established**: Year of establishment
- **description**: Brief description (max 200 characters)
- **sector**: One of: Government, National, Academic, Commercial
- **verified**: Must be `true` (all entries must be verified)
- **lastUpdated**: Date of last information update (YYYY-MM-DD format)

---

## 📥 Contributing
We welcome contributions! To add a new CERT entry:

1. **Fork** the repository
2. **Add** a new entry to `data/certs.json` following the data format above
3. **Ensure alphabetical ordering** by country name
4. **Verify** your data source (must be from official sources)
5. **Test locally** to ensure the entry displays correctly
6. **Submit** a Pull Request with verification references

### Example Entry Addition
```json
{
  "country": "Japan",
  "name": "JPCERT/CC",
  "fullName": "Japan Computer Emergency Response Team Coordination Center",
  "website": "https://www.jpcert.or.jp",
  "emergencyContact": "+81-3-6271-8901",
  "email": "info@jpcert.or.jp",
  "established": "1996",
  "description": "Japan's national CERT providing cybersecurity incident response and coordination services.",
  "sector": "National",
  "verified": true,
  "lastUpdated": "2024-01-15"
}
```

For full details, check out [CONTRIBUTING.md](CONTRIBUTING.md). 🚀

---

## ✅ Data Verification
To maintain **accuracy and reliability**, all data must:
- Be sourced from **official CERT or government websites**
- Include **verifiable references** in the Pull Request
- Follow the **exact JSON schema** defined above
- Maintain **alphabetical ordering** by country name in `data/certs.json`
- Have **verified** field set to `true`
- Include recent **lastUpdated** date

### Verification Sources (Priority Order)
1. Official CERT website
2. Government cybersecurity agency sites
3. International CERT coordination bodies (e.g., FIRST.org)
4. Academic institutions (for university CERTs)

See [AUTHENTICATION.md](AUTHENTICATION.md) for detailed verification process.

---

## 📜 License
This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 💡 Acknowledgments
A huge thanks to all contributors who help keep **CERTopedia** up-to-date and accurate! 🌟

---

🚀 **Join us in making cybersecurity emergency response more accessible worldwide!**

