# Data Verification (AUTHENTICATION.md)

To maintain the integrity and accuracy of the CERTopedia database, all submitted CERT data must go through a verification process before being merged into the main repository.

## ✅ Verification Criteria
1. **Official Sources Only**
   - Data must be sourced from an **official CERT website**, government page, or a verified cybersecurity agency.
   - Wikipedia or third-party blogs are **not** considered valid sources.

2. **Cross-Validation**
   - Information should be **cross-checked** with at least one other reliable source (e.g., government cybersecurity reports, official press releases).

3. **Consistent Formatting**
   - Ensure the data follows the correct format as seen in `certs.json`.
   - Country names must be **alphabetically ordered**.

4. **Active Status Check**
   - Verify that the CERT is currently **operational** and not defunct.
   - If a CERT is outdated or rebranded, update the information accordingly.

## 🔍 How to Verify Data
### Manual Verification
- Visit the **official website** listed in the submission.
- Confirm that the emergency contact information is present and accurate.
- Cross-reference with cybersecurity agencies or government portals.

### Automated Verification (Planned Feature)
- A future Go-based script will periodically check the **availability** and **validity** of CERT websites.
- Automated alerts will notify maintainers of potential inconsistencies.

## 🚨 Reporting Incorrect Data
If you find incorrect or outdated information in CERTopedia:
- Open a **GitHub Issue** in the repository.
- Provide details of the incorrect entry along with a valid official source.
- Maintainers will review and update the data accordingly.

By following this verification process, we ensure CERTopedia remains a **trustworthy** resource for global cybersecurity response teams. 🚀

