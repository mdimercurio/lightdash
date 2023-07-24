import { Menu, Portal } from '@blueprintjs/core';
import {
    MenuItem2,
    Popover2,
    Popover2TargetProps,
} from '@blueprintjs/popover2';
import { subject } from '@casl/ability';
import { getItemMap, ResultRow } from '@lightdash/common';
import React, {
    FC,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import { useParams } from 'react-router-dom';
import { EChartSeries } from '../../../hooks/echarts/useEcharts';
import useToaster from '../../../hooks/toaster/useToaster';
import { useExplore } from '../../../hooks/useExplore';
import { useApp } from '../../../providers/AppProvider';
import { useExplorerContext } from '../../../providers/ExplorerProvider';
import { useTracking } from '../../../providers/TrackingProvider';
import { EventName } from '../../../types/Events';
import { Can } from '../../common/Authorization';
import { useVisualizationContext } from '../../LightdashVisualization/VisualizationProvider';
import DrillDownMenuItem from '../../MetricQueryData/DrillDownMenuItem';
import {
    getDataFromChartClick,
    useMetricQueryDataContext,
} from '../../MetricQueryData/MetricQueryDataProvider';

type Props = {
    menuPosition: { left: number; top: number } | undefined;
    dimensions: string[] | undefined;
    series: EChartSeries[] | undefined;
    seriesIndex: number | undefined;
    dimensionNames: string[] | undefined;
    data: Record<string, ResultRow> | undefined;
};

export const SeriesContextMenu: FC<Props> = memo(
    ({
        menuPosition,
        dimensions,
        series,
        seriesIndex,
        dimensionNames,
        data,
    }) => {
        const { showToastSuccess } = useToaster();

        console.log({
            menuPosition,
            dimensions,
            series,
            seriesIndex,
            dimensionNames,
            data,
        });

        const tableName = useExplorerContext(
            (context) => context.state.unsavedChartVersion.tableName,
        );
        const { data: explore } = useExplore(tableName);
        const context = useVisualizationContext();
        const { resultsData: { metricQuery } = {} } = context;

        const [contextMenuIsOpen, setContextMenuIsOpen] = useState(false);
        const { openUnderlyingDataModal } = useMetricQueryDataContext();

        const [contextMenuTargetOffset, setContextMenuTargetOffset] =
            useState(menuPosition);

        const { track } = useTracking();
        const { user } = useApp();
        const { projectUuid } = useParams<{ projectUuid: string }>();

        useEffect(() => {
            if (!menuPosition) return;

            setContextMenuIsOpen(true);
            setContextMenuTargetOffset(menuPosition);
        }, [menuPosition]);

        const underlyingData = useMemo(() => {
            if (
                !explore ||
                seriesIndex === undefined ||
                !dimensionNames ||
                !data
            ) {
                return;
            }

            const allItemsMap = getItemMap(
                explore,
                metricQuery?.additionalMetrics,
                metricQuery?.tableCalculations,
            );

            return getDataFromChartClick(
                allItemsMap,
                series || [],
                seriesIndex,
                dimensionNames,
                data,
            );
        }, [explore, metricQuery, series, seriesIndex, dimensionNames, data]);

        const onViewUnderlyingData = useCallback(() => {
            if (underlyingData !== undefined) {
                openUnderlyingDataModal({
                    ...underlyingData,
                    dimensions,
                });
            }
        }, [openUnderlyingDataModal, dimensions, underlyingData]);
        const contextMenuRenderTarget = useCallback(
            ({ ref }: Popover2TargetProps) => (
                <Portal>
                    <div
                        style={{
                            position: 'absolute',
                            ...contextMenuTargetOffset,
                        }}
                        ref={ref}
                    />
                </Portal>
            ),
            [contextMenuTargetOffset],
        );

        const cancelContextMenu = useCallback(
            (e: React.SyntheticEvent<HTMLDivElement>) => e.preventDefault(),
            [],
        );

        const onClose = useCallback(() => setContextMenuIsOpen(false), []);

        return (
            <Popover2
                content={
                    <div onContextMenu={cancelContextMenu}>
                        <Menu>
                            <Can
                                I="view"
                                this={subject('UnderlyingData', {
                                    organizationUuid:
                                        user.data?.organizationUuid,
                                    projectUuid: projectUuid,
                                })}
                            >
                                <MenuItem2
                                    text={`View underlying data`}
                                    icon={'layers'}
                                    onClick={() => {
                                        onViewUnderlyingData();
                                        track({
                                            name: EventName.VIEW_UNDERLYING_DATA_CLICKED,
                                            properties: {
                                                organizationId:
                                                    user?.data
                                                        ?.organizationUuid,
                                                userId: user?.data?.userUuid,
                                                projectId: projectUuid,
                                            },
                                        });
                                    }}
                                />
                            </Can>
                            {underlyingData?.value && (
                                <CopyToClipboard
                                    text={underlyingData.value.formatted}
                                    onCopy={() => {
                                        showToastSuccess({
                                            title: 'Copied to clipboard!',
                                        });
                                    }}
                                >
                                    <MenuItem2
                                        text="Copy value"
                                        icon="duplicate"
                                    />
                                </CopyToClipboard>
                            )}
                            <Can
                                I="view"
                                this={subject('Explore', {
                                    organizationUuid:
                                        user.data?.organizationUuid,
                                    projectUuid: projectUuid,
                                })}
                            >
                                <DrillDownMenuItem
                                    {...underlyingData}
                                    trackingData={{
                                        organizationId:
                                            user?.data?.organizationUuid,
                                        userId: user?.data?.userUuid,
                                        projectId: projectUuid,
                                    }}
                                />
                            </Can>
                        </Menu>
                    </div>
                }
                enforceFocus={false}
                hasBackdrop={true}
                isOpen={contextMenuIsOpen}
                minimal={true}
                onClose={onClose}
                placement="right-start"
                positioningStrategy="fixed"
                rootBoundary={'viewport'}
                renderTarget={contextMenuRenderTarget}
                transitionDuration={100}
            />
        );
    },
);
