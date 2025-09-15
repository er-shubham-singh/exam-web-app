import * as domainService from "../Services/domain.service.js";

// ✅ Create a new domain
export const createDomain = async (req, res) => {
  try {
    const domain = await domainService.createDomainService(req.body);
    res.status(201).json({ success: true, message: domain });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ Get all domains
export const getAllDomains = async (req, res) => {
  try {
    const domains = await domainService.getAllDomainsService(req.query);
    res.status(200).json({ success: true, message: domains });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get domain by ID
export const getDomainById = async (req, res) => {
  try {
    const domain = await domainService.getDomainByIdService(req.params.id);
    if (!domain) {
      return res.status(404).json({ success: false, message: "Domain not found" });
    }
    res.status(200).json({ success: true, message: domain });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Update domain
export const updateDomain = async (req, res) => {
  try {
    const updated = await domainService.updateDomainService(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Domain not found" });
    }
    res.status(200).json({ success: true, message: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ Delete domain
export const deleteDomain = async (req, res) => {
  try {
    const deleted = await domainService.deleteDomainService(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Domain not found" });
    }
    res.status(200).json({ success: true, message: "Domain deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
