import pandas as pd

def safe_concat_dataframes(frames):
    """
    Concatenates a list of DataFrames safely, avoiding dtype inference issues
    from all-NaN columns. Keeps dataframes that are non-empty and not all-NA.

    Parameters:
        frames (list of pd.DataFrame): List of dataframes to concatenate.

    Returns:
        pd.DataFrame: Concatenated dataframe with consistent dtypes.
    """
    # Filter out completely empty or all-NA dataframes
    valid_frames = [
        df for df in frames
        if not df.empty and not df.isna().all(axis=None)
    ]

    if not valid_frames:
        return pd.DataFrame()

    # Infer correct dtypes for each column from non-all-NA columns
    columns_and_dtypes = {}
    all_columns = {col for df in valid_frames for col in df.columns}

    for df in valid_frames:
        for col in df.columns:
            if col not in columns_and_dtypes and not df[col].isna().all():
                columns_and_dtypes[col] = df[col].dtype
        if len(columns_and_dtypes) == len(all_columns):
            break  # Stop early if we've got all known columns

    # Align dtypes across frames
    aligned_frames = []
    for df in valid_frames:
        for col, dtype in columns_and_dtypes.items():
            if col in df.columns:
                df[col] = df[col].astype(dtype)
        aligned_frames.append(df)

    return pd.concat(aligned_frames, ignore_index=True)
