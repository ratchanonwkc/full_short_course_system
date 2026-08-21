import { useEffect, useState } from "react";
import SearchableCombobox from "../../../../components/common/SearchableCombobox";
import { getBatches } from "../../../batches/services/batchApi";
import { getOpenStudyGroups } from "../../services/publicApi";

export default function StepCourseSelection({ selectedGroup, onSelectGroup, lockedGroupId }) {
    const [batches, setBatches] = useState([]);
    const [batchId, setBatchId] = useState("");
    const [groups, setGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);

    useEffect(() => {
        getBatches().then(setBatches).catch(() => setBatches([]));
    }, []);

    useEffect(() => {
        if (!batchId) {
            setGroups([]);
            return;
        }
        setLoadingGroups(true);
        getOpenStudyGroups({ batch_id: batchId })
            .then(setGroups)
            .catch(() => setGroups([]))
            .finally(() => setLoadingGroups(false));
    }, [batchId]);

    if (lockedGroupId) {
        return (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                <p className="mb-1 text-xs font-bold text-indigo-500">วิชาที่เลือกไว้แล้ว</p>
                <h3 className="text-lg font-black text-indigo-900">{selectedGroup?.group_name}</h3>
                <p className="mt-1 text-sm text-indigo-600">
                    รหัส {selectedGroup?.group_code} • เหลือ {selectedGroup?.remaining_seats} ที่นั่ง
                </p>
            </div>
        );
    }

    const batchOptions = batches.map((b) => ({ value: b.id, label: b.batch_name }));
    const groupOptions = groups.map((g) => ({
        value: g.id,
        label: `${g.group_code} — ${g.group_name}${g.remaining_seats <= 0 ? " (เต็ม)" : ""}`,
    }));

    const handleGroupChange = (id) => {
        const g = groups.find((x) => String(x.id) === String(id));
        onSelectGroup(g || null);
    };

    return (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-600">รุ่นการเรียน *</label>
                <SearchableCombobox
                    value={batchId}
                    onChange={(v) => {
                        setBatchId(v);
                        onSelectGroup(null);
                    }}
                    options={batchOptions}
                    placeholder="เลือกรุ่นการเรียน..."
                />
            </div>
            <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-600">กลุ่มเรียน / วิชา *</label>
                <SearchableCombobox
                    value={selectedGroup?.id || ""}
                    onChange={handleGroupChange}
                    options={groupOptions}
                    placeholder={batchId ? (loadingGroups ? "กำลังโหลด..." : "เลือกกลุ่มเรียน...") : "เลือกรุ่นการเรียนก่อน"}
                    disabled={!batchId || loadingGroups}
                />
            </div>
            {selectedGroup && (
                <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                    <p className="font-bold">{selectedGroup.group_name}</p>
                    <p>
                        เหลือ {selectedGroup.remaining_seats} ที่นั่ง •{" "}
                        {selectedGroup.is_free ? "ไม่มีค่าใช้จ่าย" : `${selectedGroup.fee.toLocaleString()} บาท`}
                    </p>
                </div>
            )}
        </div>
    );
}
