import { getBlankTemplateService } from './print.service.js';

export const getBlankTemplate = async (req, res, next) => {
    try {
        const { study_group_id } = req.params;
        const result = await getBlankTemplateService(study_group_id);
        res.json(result);
    } catch (error) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        next(error);
    }
};
