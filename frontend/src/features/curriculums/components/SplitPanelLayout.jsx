import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";

/**
 * SplitPanelLayout
 * -------------------------------------------------------------------------
 * Master-Detail shell ที่ใช้ร่วมกันได้ทุกแท็บของ Academic Structure:
 *   - Desktop (lg ขึ้นไป): แสดง Grid ฝั่งซ้าย (~62%) + Form Panel ฝั่งขวา (~38%) พร้อมกัน
 *   - Mobile/Tablet: แสดงเฉพาะ Grid เต็มจอ แล้วเปิด Form เป็น Slide-over Drawer จากขวา
 *
 * Props:
 * - grid: ReactNode           -> ตาราง AG-Grid + Toolbar (ฝั่งซ้าย)
 * - form: ReactNode           -> Form Panel (ฝั่งขวา / Drawer บนมือถือ)
 * - isFormOpen: boolean       -> ควบคุมการเปิด Drawer บนมือถือเท่านั้น (desktop โชว์ค้างไว้เสมอ)
 * - onCloseForm: () => void
 */
export default function SplitPanelLayout({ grid, form, isFormOpen = true, onCloseForm }) {
    return (
        <div className="flex flex-col gap-4 flex-1 min-h-[380px] min-h-0 lg:flex-row">
            {/* ฝั่งซ้าย: Grid */}
            <div className="flex min-h-[380px] flex-1 flex-col lg:min-h-0 lg:basis-[62%]">
                {grid}
            </div>

            {/* ฝั่งขวา: Form Panel (desktop เต็มความสูง, ติดหน้าจอเสมอ) */}
            <div className="hidden lg:block lg:basis-[38%] lg:min-h-0 h-full">
                <div className="h-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    {form}
                </div>
            </div>

            {/* Mobile/Tablet: Slide-over Drawer */}
            <Transition appear show={isFormOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50 lg:hidden" onClose={onCloseForm}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                        leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-900/50" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-hidden">
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                                <Transition.Child
                                    as={Fragment}
                                    enter="transform transition ease-in-out duration-300"
                                    enterFrom="translate-x-full" enterTo="translate-x-0"
                                    leave="transform transition ease-in-out duration-200"
                                    leaveFrom="translate-x-0" leaveTo="translate-x-full"
                                >
                                    <Dialog.Panel className="pointer-events-auto flex h-full w-screen max-w-md flex-col bg-white shadow-xl">
                                        <div className="flex items-center justify-end border-b border-slate-100 px-4 py-2 lg:hidden">
                                            <button
                                                type="button"
                                                onClick={onCloseForm}
                                                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">{form}</div>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}