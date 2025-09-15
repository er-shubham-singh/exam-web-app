import Domain from "../Modal/domain.model.js";

// ✅ Create domain
export const createDomainService = async (data) => {
  return await Domain.create(data);
};

// ✅ Get all domains (optionally filter by category)
export const getAllDomainsService = async (query = {}) => {
  const filter = {};
  if (query.category) {
    filter.category = query.category;
  }
  return await Domain.find(filter).sort({ domain: 1 });
};

// ✅ Get domain by ID
export const getDomainByIdService = async (id) => {
  return await Domain.findById(id);
};

// ✅ Update domain
export const updateDomainService = async (id, data) => {
  return await Domain.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};

// ✅ Delete domain
export const deleteDomainService = async (id) => {
  return await Domain.findByIdAndDelete(id);
};
