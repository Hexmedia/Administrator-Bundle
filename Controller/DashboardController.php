<?php

namespace Hexmedia\AdministratorBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;

class DashboardController extends Controller {

	/**
	 * @Template()
	 */
	public function dashboardAction() {
		/**
		 * @var WhiteOctober\BreadcrumbsBundle\Model\Breadcrumbs
		 */
		$breadcrumbs = $this->get("white_october_breadcrumbs");

		$breadcrumbs->addItem("Dashboard");

		return array();
	}

}
