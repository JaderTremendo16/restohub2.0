import { gql } from "@apollo/client/core";

export const MONTHLY_REPORT = gql`
  query ReporteCombinado($fromYear: Int, $toYear: Int, $restaurant_id: String) {
    monthlyReport(fromYear: $fromYear, toYear: $toYear, restaurant_id: $restaurant_id) {
      year
      month
      monthName
      totalOrders
      totalRevenue
      averageTicket
    }
    posMonthlyReport(fromYear: $fromYear, toYear: $toYear, restaurant_id: $restaurant_id) {
      year
      month
      monthName
      totalOrders
      totalRevenue
      averageTicket
    }
  }
`;
