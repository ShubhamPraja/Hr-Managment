"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Pagination } from "antd";
import { List, type RowComponentProps } from "react-window";

type TableAlign = "left" | "center" | "right";

export type VirtualTableColumn<T> = {
  key: string;
  title: React.ReactNode;
  dataIndex?: keyof T;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  width?: number | string;
  minWidth?: number;
  align?: TableAlign;
  className?: string;
  headerClassName?: string;
};

type SummaryInput = {
  from: number;
  to: number;
  total: number;
};

type CommonVirtualTableProps<T> = {
  columns: VirtualTableColumn<T>[];
  data: T[];
  rowKey: keyof T | ((record: T) => React.Key);
  loading?: boolean;
  emptyText?: React.ReactNode;
  pageSize?: number;
  rowHeight?: number;
  bodyHeight?: number;
  minTableWidth?: number;
  overscanCount?: number;
  showPagination?: boolean;
  striped?: boolean;
  loadingRows?: number;
  resetPageKey?: unknown;
  summaryText?: (input: SummaryInput) => React.ReactNode;
  className?: string;
};

type RowRendererProps<T> = {
  rows: T[];
  columns: VirtualTableColumn<T>[];
  getRowKey: (record: T) => React.Key;
  rowHeight: number;
  gridTemplateColumns: string;
  striped: boolean;
};

const joinClasses = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const alignToCellClass: Record<TableAlign, string> = {
  left: "justify-start text-left",
  center: "justify-center text-center",
  right: "justify-end text-right",
};

function renderCellValue<T>(
  column: VirtualTableColumn<T>,
  record: T,
  index: number,
) {
  const value = column.dataIndex ? record[column.dataIndex] : undefined;

  if (column.render) {
    return column.render(value, record, index);
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function buildGridTemplate<T>(columns: VirtualTableColumn<T>[]) {
  return columns
    .map((column) => {
      if (typeof column.width === "number") return `${column.width}px`;
      if (typeof column.width === "string") return column.width;
      return `minmax(${column.minWidth ?? 140}px, 1fr)`;
    })
    .join(" ");
}

function estimateTableMinWidth<T>(
  columns: VirtualTableColumn<T>[],
  explicitWidth?: number,
) {
  if (explicitWidth && explicitWidth > 0) return explicitWidth;

  return columns.reduce((total, column) => {
    if (typeof column.width === "number") return total + column.width;
    return total + (column.minWidth ?? 140);
  }, 0);
}

function CommonVirtualTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyText = "No records found.",
  pageSize = 8,
  rowHeight = 72,
  bodyHeight,
  minTableWidth,
  overscanCount = 4,
  showPagination = true,
  striped = true,
  loadingRows,
  resetPageKey,
  summaryText,
  className,
}: CommonVirtualTableProps<T>) {
  const safePageSize = Math.max(1, pageSize);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (resetPageKey !== undefined) {
      setCurrentPage(1);
    }
  }, [resetPageKey]);

  const totalPages = Math.max(1, Math.ceil(data.length / safePageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = showPagination ? (currentPage - 1) * safePageSize : 0;

  const visibleRows = useMemo(() => {
    if (!showPagination) return data;
    return data.slice(startIndex, startIndex + safePageSize);
  }, [data, safePageSize, showPagination, startIndex]);

  const totalRows = data.length;
  const rangeStart = totalRows === 0 ? 0 : startIndex + 1;
  const rangeEnd = showPagination
    ? Math.min(startIndex + visibleRows.length, totalRows)
    : totalRows;

  const gridTemplateColumns = useMemo(
    () => buildGridTemplate(columns),
    [columns],
  );
  const computedMinTableWidth = useMemo(
    () => estimateTableMinWidth(columns, minTableWidth),
    [columns, minTableWidth],
  );

  const getRowKey = useMemo(() => {
    if (typeof rowKey === "function") return rowKey;
    return (record: T) => {
      const value = record[rowKey];
      if (typeof value === "string" || typeof value === "number") return value;
      return String(value ?? "");
    };
  }, [rowKey]);

  const virtualListHeight =
    bodyHeight ?? Math.max(rowHeight, visibleRows.length * rowHeight);
  const loadingShimmerRows = loadingRows ?? safePageSize;
  const showFooterPagination =
    showPagination && !loading && totalRows > safePageSize;

  const Row = ({
    index,
    style,
    rows,
    columns: rowColumns,
    getRowKey: rowKeyResolver,
    gridTemplateColumns: rowGridTemplate,
    striped: isStriped,
    rowHeight: rowPxHeight,
    ariaAttributes,
  }: RowComponentProps<RowRendererProps<T>>) => {
    const record = rows[index];

    if (!record) return null;

    return (
      <div style={style} {...ariaAttributes}>
        <div
          data-row-key={String(rowKeyResolver(record))}
          className={joinClasses(
            "grid border-b border-[var(--border-soft)] text-[0.88rem] text-[var(--color-text)]",
            isStriped && index % 2 === 1 && "bg-[var(--surface-2)]",
          )}
          style={{
            gridTemplateColumns: rowGridTemplate,
            height: rowPxHeight,
          }}
        >
          {rowColumns.map((column) => (
            <div
              key={column.key}
              className={joinClasses(
                "px-4 h-full flex items-center min-w-0",
                alignToCellClass[column.align ?? "left"],
                column.className,
              )}
            >
              {renderCellValue(column, record, index)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const footerSummary = summaryText
    ? summaryText({ from: rangeStart, to: rangeEnd, total: totalRows })
    : `Showing ${rangeStart}-${rangeEnd} of ${totalRows} records`;

  return (
    <div
      className={joinClasses(
        "rounded-2xl border border-[var(--border-soft)] overflow-hidden",
        className,
      )}
    >
      <div className="overflow-x-auto scrollbar-hide">
        <div style={{ minWidth: computedMinTableWidth }}>
          <div
            className="grid bg-[var(--surface-2)] border-b border-[var(--border-soft)]"
            style={{ gridTemplateColumns }}
          >
            {columns.map((column) => (
              <div
                key={column.key}
                className={joinClasses(
                  "px-4 py-3 ui-label text-[var(--color-text-soft)]",
                  column.align === "center" && "text-center",
                  column.align === "right" && "text-right",
                  column.headerClassName,
                )}
              >
                {column.title}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: loadingShimmerRows }).map((_, index) => (
                <div key={index} className="h-[56px] rounded-xl shimmer" />
              ))}
            </div>
          ) : totalRows === 0 ? (
            <div className="px-6 py-10 text-center text-[0.9rem] text-[var(--color-text-soft)]">
              {emptyText}
            </div>
          ) : (
            <List
              rowCount={visibleRows.length}
              rowHeight={rowHeight}
              rowComponent={Row}
              rowProps={{
                rows: visibleRows,
                columns,
                getRowKey,
                gridTemplateColumns,
                striped,
                rowHeight,
              }}
              overscanCount={overscanCount}
              style={{ height: virtualListHeight, width: "100%" }}
            />
          )}
        </div>
      </div>

      {showFooterPagination && (
        <div className="px-4 py-3 border-t border-[var(--border-soft)] bg-[var(--surface-2)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="ui-subtitle text-[var(--color-text-soft)]">
            {footerSummary}
          </p>
          <Pagination
            current={currentPage}
            total={totalRows}
            pageSize={safePageSize}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
          />
        </div>
      )}
    </div>
  );
}

export default CommonVirtualTable;
