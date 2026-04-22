import { gql } from "@apollo/client/core";

export const MONTHLY_REPORT = gql`
  query ReporteCombinado($fromYear: Int, $toYear: Int) {
    monthlyReport(fromYear: $fromYear, toYear: $toYear) {
      year
      month
      monthName
      totalOrders
      totalRevenue
      averageTicket
    }
    posMonthlyReport(fromYear: $fromYear, toYear: $toYear) {
      year
      month
      monthName
      totalOrders
      totalRevenue
      averageTicket
    }
  }
`;
