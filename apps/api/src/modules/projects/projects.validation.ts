export const validateCreateProject = (body: any): { error?: string; data?: { name: string; color: string } } => {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be an object' };
  }
  const { name, color } = body;
  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'Name is required and must be a non-empty string' };
  }
  if (typeof color !== 'string' || !color.trim()) {
    return { error: 'Color is required and must be a non-empty string' };
  }
  return { data: { name: name.trim(), color: color.trim() } };
};

export const validateUpdateProject = (body: any): { error?: string; data?: { name?: string; color?: string; icon?: string | null } } => {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be an object' };
  }
  const { name, color, icon } = body;
  const data: any = {};
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return { error: 'Name must be a non-empty string' };
    }
    data.name = name.trim();
  }
  if (color !== undefined) {
    if (typeof color !== 'string' || !color.trim()) {
      return { error: 'Color must be a non-empty string' };
    }
    data.color = color.trim();
  }
  if (icon !== undefined) {
    if (icon !== null && typeof icon !== 'string') {
      return { error: 'Icon must be a string or null' };
    }
    data.icon = icon;
  }
  return { data };
};

export const validateReorderProjects = (body: any): { error?: string; data?: { orderedIds: string[] } } => {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be an object' };
  }
  const { orderedIds } = body;
  if (!Array.isArray(orderedIds) || orderedIds.some(id => typeof id !== 'string')) {
    return { error: 'orderedIds must be an array of strings' };
  }
  return { data: { orderedIds } };
};
