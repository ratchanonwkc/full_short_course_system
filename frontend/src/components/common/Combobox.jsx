import SearchableCombobox from "./SearchableCombobox";

/**
 * Combobox
 * -------------------------------------------------------------------------
 * Thin, purpose-named wrapper around the existing <SearchableCombobox>
 * so feature code can import a generically-named "Combobox" per the
 * deliverables spec, without duplicating the headlessui implementation.
 *
 * Props: id, value, onChange, options: [{ value, label }], placeholder, disabled
 */
export default function Combobox(props) {
    return <SearchableCombobox {...props} />;
}