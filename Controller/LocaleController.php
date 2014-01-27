<?php

namespace Hexmedia\AdministratorBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;

class LocaleController extends Controller
{
    /**
     * @Template()
     */
    public function changeAction($loc)
    {
        $session = $this->get('session');

        if (in_array($loc, $this->container->getParameter("locales"))) {
            $session->set('locale', $loc);
        }

        return $this->redirect( /*$this->getRefererUrl() ? $this->getRefererUrl() :*/
            $this->get('router')->generate("homepage"));
    }

    public function getRefererUrl()
    {
        $request = $this->getRequest();

        //look for the referer route

        //FIXME: Get current route, parse it and if it's *.$locale translate it to current language.
        $referer = $request->headers->get('referer');
        $lastPath = substr($referer, strpos($referer, $request->getBaseUrl()));

        return $lastPath;
    }
}
