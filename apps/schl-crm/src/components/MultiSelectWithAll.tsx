'use client';

import React, { useMemo } from 'react';
import Select, { MultiValue, Props as SelectProps } from 'react-select';

export interface Option {
    label: string;
    value: string;
}

interface MultiSelectWithAllProps
    extends Omit<SelectProps<Option, true>, 'isMulti' | 'onChange' | 'value'> {
    options: Option[];
    value: string[];
    onChange: (values: string[]) => void;
    selectAllLabel?: string;
    hideSelectAllTag?: boolean;
    showAllSelectedChip?: boolean;
    allSelectedLabel?: string;
}

const SELECT_ALL_VALUE = '__SELECT_ALL__';

export const MultiSelectWithAll: React.FC<MultiSelectWithAllProps> = ({
    options,
    value,
    onChange,
    selectAllLabel = 'All',
    hideSelectAllTag = true,
    showAllSelectedChip = false,
    allSelectedLabel = 'All selected',
    ...rest
}) => {
    const allValues = useMemo(() => options.map(o => o.value), [options]);

    const allSelected = useMemo(
        () => allValues.length > 0 && allValues.every(v => value.includes(v)),
        [allValues, value],
    );

    const optionsWithSelectAll = useMemo(
        () => [{ label: selectAllLabel, value: SELECT_ALL_VALUE }, ...options],
        [options, selectAllLabel],
    );

    const selectedOptions = useMemo(
        () => options.filter(o => value.includes(o.value)),
        [options, value],
    );

    const handleChange = (selected: MultiValue<Option>) => {
        const selectedValues = selected?.map(o => o.value) || [];

        // Check if "Select All" was just clicked
        if (
            selectedValues.includes(SELECT_ALL_VALUE) &&
            !value.includes(SELECT_ALL_VALUE)
        ) {
            // Select all options
            onChange(allValues);
            return;
        }

        // Check if "Select All" was just deselected
        if (!selectedValues.includes(SELECT_ALL_VALUE) && allSelected) {
            // Deselect all
            onChange([]);
            return;
        }

        // Normal selection (filter out the select all value)
        onChange(selectedValues.filter(v => v !== SELECT_ALL_VALUE));
    };

    const displayedValue = useMemo(() => {
        if (allSelected) {
            if (showAllSelectedChip) {
                return [{ label: allSelectedLabel, value: SELECT_ALL_VALUE }];
            }
            if (hideSelectAllTag) {
                return selectedOptions;
            }
            return [
                { label: selectAllLabel, value: SELECT_ALL_VALUE },
                ...selectedOptions,
            ];
        }
        return selectedOptions;
    }, [
        allSelected,
        selectedOptions,
        selectAllLabel,
        hideSelectAllTag,
        showAllSelectedChip,
        allSelectedLabel,
    ]);

    return (
        <Select<Option, true>
            {...rest}
            isMulti
            options={optionsWithSelectAll}
            value={displayedValue}
            onChange={handleChange}
            closeMenuOnSelect={false}
            hideSelectedOptions={false}
        />
    );
};

export default MultiSelectWithAll;
