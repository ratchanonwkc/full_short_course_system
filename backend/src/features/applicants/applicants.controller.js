import { getApplicantTrackService } from './applicants.service.js';

export const trackApplicant = async (req, res, next) => {
    try {
        const { citizen_id } = req.params;
        const result = await getApplicantTrackService(citizen_id);
        res.json(result);
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }
        next(error);
    }
};
