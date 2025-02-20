import { ApiErrorPayload, FiltersResponse } from '@lightdash/common';
import { Body, Get, Post } from '@tsoa/runtime';
import express from 'express';
import {
    Controller,
    Middlewares,
    OperationId,
    Path,
    Request,
    Response,
    Route,
    SuccessResponse,
    Tags,
} from 'tsoa';
import { projectService } from '../services/services';
import { allowApiKeyAuthentication, isAuthenticated } from './authentication';
import { ApiRunQueryResponse } from './runQueryController';

@Route('/api/v1/saved/{chartUuid}')
@Response<ApiErrorPayload>('default', 'Error')
@Tags('Charts')
export class SavedChartController extends Controller {
    /**
     * Run a query for a chart
     * @param chartUuid chartUuid for the chart to run
     * @param filters dashboard filters
     * @param req express request
     */
    @Middlewares([allowApiKeyAuthentication, isAuthenticated])
    @SuccessResponse('200', 'Success')
    @Post('/results')
    @OperationId('postChartResults')
    async postDashboardTile(
        @Body() body: { filters?: FiltersResponse },
        @Path() chartUuid: string,
        @Request() req: express.Request,
    ): Promise<ApiRunQueryResponse> {
        this.setStatus(200);
        return {
            status: 'ok',
            results: await projectService.runViewChartQuery(
                req.user!,
                chartUuid,
                body.filters,
            ),
        };
    }
}
