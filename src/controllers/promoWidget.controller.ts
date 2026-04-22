import { Request, Response } from "express";
import { PromoWidget } from "../models/PromoWidget";

export const getPromoWidgets = async (req: Request, res: Response) => {
    try {
        const { position, isActive } = req.query;
        let filter: any = {};
        if (position) filter.position = position;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const widgets = await PromoWidget.find(filter).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Fetched promo widgets successfully",
            data: widgets,
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getPromoWidgetById = async (req: Request, res: Response) => {
    try {
        const widget = await PromoWidget.findById(req.params.id);
        if (!widget) return res.status(404).json({ success: false, message: "Widget not found" });

        return res.status(200).json({ success: true, data: widget });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createPromoWidget = async (req: Request, res: Response) => {
    try {
        const widget = new PromoWidget(req.body);
        await widget.save();
        return res.status(201).json({ success: true, message: "Created successfully", data: widget });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const updatePromoWidget = async (req: Request, res: Response) => {
    try {
        const widget = await PromoWidget.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!widget) return res.status(404).json({ success: false, message: "Widget not found" });

        return res.status(200).json({ success: true, message: "Updated successfully", data: widget });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const toggleActive = async (req: Request, res: Response) => {
    try {
        const widget = await PromoWidget.findById(req.params.id);
        if (!widget) return res.status(404).json({ success: false, message: "Widget not found" });

        widget.isActive = !widget.isActive;
        await widget.save();

        return res.status(200).json({ success: true, message: `Widget ${widget.isActive ? 'activated' : 'deactivated'}`, data: widget });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const deletePromoWidget = async (req: Request, res: Response) => {
    try {
        const widget = await PromoWidget.findByIdAndDelete(req.params.id);
        if (!widget) return res.status(404).json({ success: false, message: "Widget not found" });
        return res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
