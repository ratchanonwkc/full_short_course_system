import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, ExternalLink, Download, FileText, Image as ImageIcon } from "lucide-react";
import { resolveStorageUrl } from "../../../utils/storageHelper";

export default function DocumentPreviewModal({ isOpen, onClose, title = "ดูเอกสาร", url: rawUrl, isPdf = false }) {
    if (!rawUrl) return null;
    const url = resolveStorageUrl(rawUrl);

    const isPdfFile = isPdf || url.toLowerCase().endsWith(".pdf");

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={onClose} className="relative z-50">
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/75" />
                </Transition.Child>

                <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                                <Dialog.Title className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                    {isPdfFile ? <FileText size={18} className="text-red-500" /> : <ImageIcon size={18} className="text-blue-600" />}
                                    {title}
                                </Dialog.Title>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
                                    >
                                        <ExternalLink size={13} /> เปิดแท็บใหม่
                                    </a>
                                    <button
                                        onClick={onClose}
                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-auto bg-slate-900/5 p-4 flex items-center justify-center min-h-[300px]">
                                {isPdfFile ? (
                                    <iframe src={url} title={title} className="h-[70vh] w-full rounded-lg border border-slate-200" />
                                ) : (
                                    <img
                                        src={url}
                                        alt={title}
                                        className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-md"
                                    />
                                )}
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}
